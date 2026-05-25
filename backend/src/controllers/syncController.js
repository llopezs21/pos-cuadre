import fs from 'fs';
import Papa from 'papaparse';
import pool from '../db/database.js';

// --- AÑADIDO: helper para parsear fechas DD/MM/YYYY -> YYYY-MM-DD ---
/**
 * Convierte fecha DD/MM/YYYY a YYYY-MM-DD (formato MySQL DATE)
 * @param {string} dateStr - Fecha en formato DD/MM/YYYY
 * @returns {string|null} - Fecha en YYYY-MM-DD o null si es inválida
 */
function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const s = dateStr.trim();
  if (s === '' || s === '00/00/0000') return null;
  const parts = s.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    if (d && m && y && (y.length === 4 || y.length === 2)) {
      const year = y.length === 2 ? `20${y}` : y;
      return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  // fallback: attempt to parse with Date
  const dObj = new Date(s);
  if (!isNaN(dObj.getTime())) {
    const Y = dObj.getFullYear();
    const M = String(dObj.getMonth() + 1).padStart(2, '0');
    const D = String(dObj.getDate()).padStart(2, '0');
    return `${Y}-${M}-${D}`;
  }
  return null;
}

// Helper: normaliza cabeceras (trim, lower, remove non-alnum)
function normalizeHeader(h) {
  return String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Mapea una fila a campos esperados para cliente
function mapClientRow(row, headersMap) {
  // Buscar por variantes comunes
  const get = (names) => {
    for (const n of names) {
      const key = headersMap[normalizeHeader(n)];
      if (key !== undefined) return row[key];
    }
    return undefined;
  };

  const rawMks = get(['Id', 'mks_id', 'mksid', 'id']);
  // eliminar ceros a la izquierda y parsear int
  const mks_id = rawMks != null && rawMks !== '' ? parseInt(String(rawMks).replace(/^0+/, ''), 10) : null;

  const name = get(['Nombre', 'name']) || '';
  const id_number = get(['Cedula', 'id_number', 'idnumber', 'identificacion']) || '';
  const phone = get(['Movil', 'Movil', 'phone', 'telefono', 'mobile']) || null;
  const email = get(['Correo', 'email', 'mail']) || null;

  return { mks_id, name, id_number, phone: phone || null, email: email || null };
}

// --- REEMPLAZO: mapInvoiceRow (usa parseDate, limpia amount y acepta VENCIDO) ---
function mapInvoiceRow(row, headersMap) {
  const get = (names) => {
    for (const n of names) {
      const normalizedName = normalizeHeader(n);
      const key = headersMap[normalizedName];
      if (key !== undefined) return row[key];
    }
    return undefined;
  };

  // Nombres de cabecera esperados según CSV
  const rawInv = get(['Nº Factura', 'nº factura', 'nro factura', 'nrofactura', 'mks_invoice_number', 'id', 'Id']);
  const mks_invoice_number = rawInv != null && rawInv !== '' ? parseInt(String(rawInv).replace(/^0+/, ''), 10) : null;

  const client_mks_id_raw = get(['ID Cliente', 'id cliente', 'client_mks_id', 'clientid', 'cliente']);
  const client_mks_id = client_mks_id_raw != null && client_mks_id_raw !== '' ? parseInt(String(client_mks_id_raw).replace(/^0+/, ''), 10) : null;

  // Limpiar y parsear monto (ej: "$ 9.00")
  const amountRaw = get(['Total', 'total', 'monto', 'importe', 'amount']) || '0';
  const amount = Number(String(amountRaw).replace(/\$/g, '').replace(/\s/g, '').replace(/,/g, '.')) || 0;

  // Fechas con formato DD/MM/YYYY
  const issue_date = parseDate(get(['F. Emitido', 'f. emitido', 'fecha emitido', 'fecha_emision', 'issue_date', 'fechaemision']));
  const due_date = parseDate(get(['F. Vencimiento', 'f. vencimiento', 'fecha vencimiento', 'due_date', 'fechavencimiento']));

  // Estado: convertir a mayúsculas y permitir VENCIDO
  let status = String((get(['Estado', 'estado', 'status']) || 'NO PAGADO')).trim().toUpperCase();
  const allowedStatuses = ['NO PAGADO', 'PAGADO', 'ANULADO', 'VENCIDO'];
  if (!allowedStatuses.includes(status)) {
    status = 'NO PAGADO';
  }

  const payment_method_external = get(['Forma de pago', 'formadepago', 'payment_method_external', 'cobro', 'cobrodigital']) || null;

  return {
    mks_invoice_number,
    client_mks_id,
    amount,
    issue_date,
    due_date,
    status,
    payment_method_external
  };
}
// --- FIN REEMPLAZO ---

// POST /api/sync/clients
export const uploadClients = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No se subió ningún archivo' });
    const csv = req.file.buffer.toString('utf8');

    const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
    if (parsed.errors && parsed.errors.length > 0) {
      console.warn('Errores al parsear CSV:', parsed.errors);
    }

    // Build headers map: normalized header -> original header key
    const headersMap = {};
    if (parsed.meta && parsed.meta.fields) {
      parsed.meta.fields.forEach(f => {
        headersMap[normalizeHeader(f)] = f;
      });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      let processed = 0, created = 0, updated = 0;

      for (const row of parsed.data) {
        const client = mapClientRow(row, headersMap);
        if (!client.mks_id) {
          // skip rows without mks_id
          continue;
        }
        processed++;

        // Upsert on external_clients by mks_id (assume mks_id unique)
        // Insert new or update fields name,id_number,phone,email
        const query = `
          INSERT INTO external_clients (mks_id, name, id_number, phone, email)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            id_number = VALUES(id_number),
            phone = VALUES(phone),
            email = VALUES(email)
        `;
        const params = [
          client.mks_id,
          client.name || null,
          client.id_number || null,
          client.phone || null,
          client.email || null
        ];
        const [result] = await connection.query(query, params);
        if (result && result.affectedRows) {
          // distinguish insert vs update: in MySQL affectedRows = 1 insert, 2 update? Use result.insertId
          if (result.insertId && result.insertId > 0) created++;
          else updated++;
        }
      }

      await connection.commit();
      return res.json({ success: true, processed, created, updated });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Error en uploadClients', err);
    return res.status(500).json({ message: err.message || 'Error procesando CSV de clientes' });
  }
};

// POST /api/sync/invoices
export const uploadInvoices = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No se subió ningún archivo' });
    const csv = req.file.buffer.toString('utf8');

    const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
    if (parsed.errors && parsed.errors.length > 0) {
      console.warn('Errores al parsear CSV:', parsed.errors);
    }

    const headersMap = {};
    if (parsed.meta && parsed.meta.fields) {
      parsed.meta.fields.forEach(f => {
        headersMap[normalizeHeader(f)] = f;
      });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      let processed = 0, created = 0, updated = 0, clientsCreated = 0;

      for (const row of parsed.data) {
        const inv = mapInvoiceRow(row, headersMap);
        if (!inv.mks_invoice_number || !inv.client_mks_id) continue;
        processed++;

        // Verificar si el cliente existe, si no, crearlo
        const [existingClient] = await connection.query(
          'SELECT mks_id FROM external_clients WHERE mks_id = ?',
          [inv.client_mks_id]
        );
        
        if (existingClient.length === 0) {
          // Cliente no existe, crear uno placeholder
          await connection.query(
            'INSERT INTO external_clients (mks_id, name) VALUES (?, ?)',
            [inv.client_mks_id, `Cliente MKS ${inv.client_mks_id}`]
          );
          clientsCreated++;
          console.log(`  ✓ Cliente ${inv.client_mks_id} creado automáticamente`);
        }

        // Upsert into external_invoices by mks_invoice_number (assume unique)
        // INSERT/UPDATE sin our_transaction_id
        const query = `
          INSERT INTO external_invoices
            (mks_invoice_number, client_mks_id, amount, issue_date, due_date, status, payment_method_external)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            client_mks_id = VALUES(client_mks_id),
            amount = VALUES(amount),
            issue_date = VALUES(issue_date),
            due_date = VALUES(due_date),
            status = VALUES(status),
            payment_method_external = VALUES(payment_method_external)
        `;
        const params = [
          inv.mks_invoice_number,
          inv.client_mks_id,
          inv.amount,
          inv.issue_date || null,
          inv.due_date || null,
          inv.status || 'NO PAGADO',
          inv.payment_method_external || null
        ];
        const [result] = await connection.query(query, params);
        if (result) {
          if (result.insertId && result.insertId > 0) created++;
          else updated++;
        }
      }

      await connection.commit();
      return res.json({ success: true, processed, created, updated, clientsCreated });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Error en uploadInvoices', err);
    return res.status(500).json({ message: err.message || 'Error procesando CSV de facturas' });
  }
};