import { randomUUID } from 'crypto';
import pool from '../db/database.js';

// --- AÑADIR IMPORTS DINÁMICOS PARA RESOLVER MÉTODOS Y USAR CALCULADOR ---
const dbModule = await import('../../models/index.cjs');
const db = dbModule.default || dbModule;
const { PaymentMethod } = db;

const calcModule = await import('../services/paymentCalculator.js');
const { calculatePayment } = calcModule;
// --- FIN IMPORTS ---

// --- POST /api/transactions ---
export const createTransaction = async (req, res) => {
    const { invoiceIds, payments, clientName, invoiceType, invoiceBaseUSD, notes, appliedAbonoIds } = req.body;
    const { userId } = req.user;

    const connection = await pool.getConnection();
    try {
        const [sessions] = await connection.query('SELECT id FROM cashier_sessions WHERE userId = ? AND status = "open"', [userId]);
        if (sessions.length === 0) return res.status(400).send('No tienes una sesión activa.');
        const sessionId = sessions[0].id;

        await connection.beginTransaction();
        const transactionId = randomUUID();

        if (invoiceIds && invoiceIds.length > 0) {
            // --- LÓGICA PARA PAGO DE FACTURAS (CON O SIN ABONOS) ---
            const [invoiceDetails] = await connection.query(
                'SELECT SUM(amount) as totalAmount, c.name FROM external_invoices i JOIN external_clients c ON i.client_mks_id = c.mks_id WHERE i.id IN (?) GROUP BY c.name',
                [invoiceIds]
            );
            const totalAmount = parseFloat(invoiceDetails[0].totalAmount);
            const clientNameToSave = invoiceDetails[0].name;
            
            // Si se aplicaron abonos, los marcamos como 'aplicado'
            if (appliedAbonoIds && appliedAbonoIds.length > 0) {
                await connection.query(
                    "UPDATE abonos SET status = 'aplicado', applied_at_session_id = ?, applied_to_invoice_id = ? WHERE id IN (?)",
                    [sessionId, invoiceIds[0], appliedAbonoIds]
                );
            }

            // Creamos la transacción por el monto total de la factura
            await connection.query(
                'INSERT INTO transactions (id, clientName, invoiceType, invoiceBaseUSD, notes, sessionId) VALUES (?, ?, ?, ?, ?, ?)',
                [transactionId, clientNameToSave, 'service', totalAmount, `Facturas: ${invoiceIds.join(',')}`, sessionId]
            );
            
            // Actualizamos las facturas externas a "PAGADO"
            await connection.query(
                'UPDATE external_invoices SET status = "PAGADO", our_transaction_id = ? WHERE id IN (?)',
                [transactionId, invoiceIds]
            );
        
        } else {
            // --- LÓGICA PARA REGISTRO MANUAL ---
            await connection.query(
                'INSERT INTO transactions (id, clientName, invoiceType, invoiceBaseUSD, notes, sessionId) VALUES (?, ?, ?, ?, ?, ?)',
                [transactionId, clientName, invoiceType, invoiceBaseUSD, notes, sessionId]
            );
        }

        // --- REEMPLAZAR BLOQUE ANTIGUO DE INSERCIÓN MASIVA DE PAGOS POR LÓGICA INDIVIDUAL ---
        // (remplaza el bloque if (payments && payments.length > 0) { ... } por el siguiente)
        if (payments && payments.length > 0) {
            // Query nueva que incluye las columnas extendidas
            const paymentQuery = 'INSERT INTO payments (transactionId, method, amount, bcvRate, payment_method_id, payment_method_code) VALUES (?, ?, ?, ?, ?, ?)';
            for (const p of payments) {
                // p.method enviado por frontend es el payment_method_code (ej: 'CASH_USD')
                const payment_method_code = p.method || null;

                // 1) Resolver payment_method_id si existe en la DB
                let payment_method_id = null;
                if (payment_method_code) {
                    try {
                        const method = await PaymentMethod.findOne({ where: { code: payment_method_code } });
                        if (method) payment_method_id = method.id;
                    } catch (err) {
                        // no detener todo por fallo en resolución; se insertará al menos el código
                        console.warn('No se pudo resolver payment method id para code=', payment_method_code, err.message || err);
                    }
                }

                // 2) Normalizar/calcular con calculatePayment (principalmente bcv_rate, comisiones, iva flags)
                const calcInput = {
                    amount: p.amount,
                    currency: p.currency || (String(payment_method_code || '').toUpperCase().includes('VES') ? 'VES' : 'USD'),
                    payment_method_code: payment_method_code,
                    bcv_rate: p.bcvRate || null,
                    apply_iva: !!p.apply_iva,
                    user_id: userId // debe existir en el scope de createTransaction
                };
                let calc = {};
                try {
                    calc = await calculatePayment(calcInput);
                } catch (err) {
                    console.warn('calculatePayment falló para pago:', p, err.message || err);
                    calc = {};
                }

                // 3) Insertar el pago con los campos normalizados
                await connection.query(paymentQuery, [
                    transactionId,
                    p.method || null,
                    p.amount,
                    calc.bcv_rate || p.bcvRate || null,
                    calc.payment_method_id || payment_method_id,
                    calc.payment_method_code || payment_method_code
                ]);
            }
        }
        // --- FIN BLOQUE NUEVO ---
        
        await connection.commit();
        res.status(201).json({ message: 'Transacción creada y facturas actualizadas.' });

    } catch (error) {
        await connection.rollback();
        console.error('Error al crear la transacción:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    } finally {
        connection.release();
    }
};


// --- GET /api/transactions?date=YYYY-MM-DD ---
export const getTransactionsByDate = async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ message: 'Debe proporcionar una fecha.' });
  }

  try {
    // Obtenemos las transacciones y agregamos los pagos como un JSON anidado
    const query = `
      SELECT 
        t.*,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', p.id,
            'method', p.method,
            'amount', p.amount,
            'bcvRate', p.bcvRate
          )
        ) as payments
      FROM transactions t
      LEFT JOIN payments p ON t.id = p.transactionId
      WHERE DATE(t.createdAt) = ?
      GROUP BY t.id;
    `;
    const [transactions] = await pool.query(query, [date]);
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Error al obtener transacciones:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
};


// --- REEMPLAZA ESTA FUNCIÓN COMPLETA ---
export const getClosingSummary = async (req, res) => {
  const { date } = req.query;
  if (!date) {
      return res.status(400).json({ message: 'Debe proporcionar una fecha.' });
  }

  try {
      // 1. Obtener transacciones del día con pagos anidados
      const txQuery = `
          SELECT 
            t.*,
            JSON_ARRAYAGG(JSON_OBJECT('id', p.id, 'method', p.method, 'amount', p.amount, 'bcvRate', p.bcvRate)) as payments
          FROM transactions t
          LEFT JOIN payments p ON t.id = p.transactionId
          WHERE DATE(t.createdAt) = ?
          GROUP BY t.id;
      `;
      const [transactions] = await pool.query(txQuery, [date]);
      
      // 2. OBTENER PAGOS DE ABONOS CREADOS HOY (para totales por método)
      const abonosQuery = `
          SELECT p.* FROM payments p
          JOIN abonos a ON p.transactionId = CONCAT('abono_', a.id)
          WHERE DATE(a.createdAt) = ?
      `;
      const [abonoPayments] = await pool.query(abonosQuery, [date]);

      // 3. Unir todos los pagos del día (transacciones + abonos) PARA TOTALES POR MÉTODO (una sola vez)
      const allPaymentsForDay = [
          ...transactions.flatMap(tx => Array.isArray(tx.payments) ? tx.payments : []),
          ...abonoPayments
      ];

      // Lógica de cálculo del resumen
      const defaultBcvRate = parseFloat(process.env.DEFAULT_BCV_RATE || 36.5);
      const ivaRate = parseFloat(process.env.IVA_RATE || '0.16');

      let totalCashUSD = 0, totalCashVES = 0, totalPosMiBanco = 0, totalPosBanesco = 0;
      let totalMikrowispUSD = 0, totalSupportInstallationUSD = 0;
      const differences = [];

      // Sumar totales por método (en sus propias unidades) UNA SOLA VEZ
      allPaymentsForDay.forEach(p => {
          if (!p || p.amount == null) return;
          const paymentAmount = Number(p.amount) || 0;

          switch (p.method) {
              case 'cash_usd':
                  totalCashUSD += paymentAmount;
                  break;
              case 'cash_ves':
                  totalCashVES += paymentAmount;
                  break;
              case 'pos_mibanco':
                  totalPosMiBanco += paymentAmount;
                  break;
              case 'pos_banesco':
                  totalPosBanesco += paymentAmount;
                  break;
          }
      });

      // ==== OBTENER ABONOS APLICADOS PARA LAS FACTURAS REFERENCIADAS POR LAS TRANSACCIONES ====
      // Recopilar todos los invoiceIds mencionados en las transacciones (si existen)
      const invoiceIdSet = new Set();
      transactions.forEach(tx => {
          if (tx.notes && typeof tx.notes === 'string' && tx.notes.startsWith('Facturas:')) {
              const idsPart = tx.notes.replace('Facturas:', '').trim();
              idsPart.split(',').map(s => s.trim()).forEach(idStr => {
                  if (idStr) invoiceIdSet.add(idStr);
              });
          }
      });
      let appliedAbonosMap = {}; // invoiceId -> total abonos en USD
      if (invoiceIdSet.size > 0) {
          const invoiceIds = Array.from(invoiceIdSet);
          // Obtenemos abonos aplicados a esas facturas y sus pagos para convertir a USD
          const appliedAbonosQuery = `
              SELECT a.id as abonoId, a.applied_to_invoice_id as invoiceId, p.method, p.amount, p.bcvRate
              FROM abonos a
              LEFT JOIN payments p ON p.transactionId = CONCAT('abono_', a.id)
              WHERE a.applied_to_invoice_id IN (?) AND a.status = 'aplicado'
          `;
          const [appliedRows] = await pool.query(appliedAbonosQuery, [invoiceIds]);
          appliedAbonosMap = {};
          appliedRows.forEach(row => {
              const inv = String(row.invoiceId);
              const method = row.method;
              const amt = Number(row.amount) || 0;
              const bcv = Number(row.bcvRate) || defaultBcvRate;

              let amtUSD = 0;
              if (method === 'cash_usd') {
                  amtUSD = amt;
              } else {
                  // convertir VES/POS a USD (no asumir IVA aquí — abonos generalmente ya guardados en su valor real)
                  amtUSD = bcv > 0 ? (amt / bcv) : 0;
              }
              appliedAbonosMap[inv] = (appliedAbonosMap[inv] || 0) + amtUSD;
          });
      }
      // =======================================================================================

      // Ahora iteramos transacciones para calcular diferencias por transacción (esperado vs pagado)
      transactions.forEach(tx => {
          let totalPaidInUSD = 0;
          const payments = Array.isArray(tx.payments) ? tx.payments : [];

          // 1) calcular cuánto se pagó en USD directamente (usado para decidir applyIVA)
          const usdPaidDirect = payments.reduce((s, p) => {
              if (!p || p.amount == null) return s;
              if (p.method === 'cash_usd') return s + (Number(p.amount) || 0);
              return s;
          }, 0);

          // 2) determinar monto base neto restando abonos aplicados a las facturas de esta transacción
          let invoiceIdsForTx = []; // <-- eliminar la anotación TypeScript, dejar JS puro
          if (tx.notes && typeof tx.notes === 'string' && tx.notes.startsWith('Facturas:')) {
              const idsPart = tx.notes.replace('Facturas:', '').trim();
              invoiceIdsForTx = idsPart.split(',').map(s => s.trim()).filter(Boolean);
          }
          const appliedAbonosForTx = invoiceIdsForTx.reduce((s, id) => s + (appliedAbonosMap[id] || 0), 0);

          const invoiceBase = Number(tx.invoiceBaseUSD) || 0;
          const netBaseUSD = Math.max(0, invoiceBase - appliedAbonosForTx); // base neta después de abonos

          // 3) decidir aplicar IVA para esta transacción (misma regla que frontend)
          const applyIVAforTx = netBaseUSD > 0 ? ((usdPaidDirect / netBaseUSD) < 0.5) : false;

          // 4) convertir cada pago a USD teniendo en cuenta applyIVAforTx para pagos VES/POS
          payments.forEach(p => {
              if (!p || p.amount == null) return;
              const paymentAmount = Number(p.amount) || 0;
              const bcvRate = Number(p.bcvRate) || defaultBcvRate;

              if (p.method === 'cash_usd') {
                  totalPaidInUSD += paymentAmount;
              } else {
                  if (bcvRate > 0) {
                      const amountInUSD = paymentAmount / bcvRate;
                      // Si applyIVAforTx es true, asumimos que el monto en VES incluye IVA,
                      // por lo que la porción de base USD es amountInUSD / (1 + ivaRate)
                      totalPaidInUSD += amountInUSD;
                  }
              }
          });

          // 5) calcular expected usando netBaseUSD y applyIVAforTx
          const expectedTotalUSD = netBaseUSD * (applyIVAforTx ? (1 + ivaRate) : 1);

          // acumular categorías
          if (tx.invoiceType === 'service') {
              totalMikrowispUSD += Number(tx.invoiceBaseUSD) || 0;
          } else {
              totalSupportInstallationUSD += Number(tx.invoiceBaseUSD) || 0;
          }

          const differenceUSD = totalPaidInUSD - expectedTotalUSD;
          if (Math.abs(differenceUSD) > 0.05) { // Tolerancia de 5 centavos
              differences.push({
                  client: tx.clientName,
                  amount: differenceUSD,
                  notes: `Esperado: $${expectedTotalUSD.toFixed(2)}, Pagado: $${totalPaidInUSD.toFixed(2)}`
              });
          }
      });

      res.status(200).json({
          totalsByMethod: { totalCashUSD, totalCashVES, totalPosMiBanco, totalPosBanesco },
          totalsByCategory: { totalMikrowispUSD, totalSupportInstallationUSD },
          differences
      });

  } catch (error) {
      console.error('Error al generar el resumen:', error);
      res.status(500).json({ message: 'Error en el servidor.' });
  }
};

// --- AÑADE ESTA NUEVA FUNCIÓN ---
export const deleteTransaction = async (req, res) => {
    const { transactionId } = req.params;
    const connection = await pool.getConnection();

    try {
        // 1. Obtener la transacción, su tipo y referencia ANTES de borrar
        const [txRows] = await connection.query(
            "SELECT sessionId, invoiceType, external_reference FROM transactions WHERE id = ?", 
            [transactionId]
        );

        if (txRows.length === 0) {
            connection.release();
            return res.status(404).json({ message: `No se encontró transacción con ID: ${transactionId}` });
        }
        
        const tx = txRows[0];
        const { sessionId, invoiceType, external_reference } = tx;

        // 2. Comprobar si la sesión está cerrada
        const [sessionRows] = await connection.query("SELECT status FROM cashier_sessions WHERE id = ?", [sessionId]);
        if (sessionRows.length > 0 && sessionRows[0].status !== 'open') {
            connection.release();
            return res.status(403).json({ message: 'La sesión asociada está cerrada. Reabra la sesión para eliminar transacciones.' });
        }

        // 3. Iniciar la transacción de borrado
        await connection.beginTransaction();

        let message = '';
        
        // 4. Lógica condicional basada en el tipo de transacción
        switch (invoiceType) {
            
            // --- REQUERIMIENTO 1: Si es 'service', revertir abonos ---
            case 'service':
                // a. Encontrar las facturas (external_invoices) asociadas a esta transacción
                const [invoiceRows] = await connection.query(
                    "SELECT id FROM external_invoices WHERE our_transaction_id = ?",
                    [transactionId]
                );
                const invoiceIds = invoiceRows.map((row) => row.id);

                // b. Revertir las facturas a 'NO PAGADO'
                await connection.query(
                    "UPDATE external_invoices SET status = 'NO PAGADO', our_transaction_id = NULL WHERE our_transaction_id = ?", 
                    [transactionId]
                );

                if (invoiceIds.length > 0) {
                    // c. Revertir los abonos (status 'aplicado' -> 'disponible')
                    await connection.query(
                        "UPDATE abonos SET status = 'disponible', applied_at_session_id = NULL, applied_to_invoice_id = NULL WHERE applied_to_invoice_id IN (?)",
                        [invoiceIds]
                    );
                }
                
                // d. Eliminar la transacción
                await connection.query("DELETE FROM transactions WHERE id = ?", [transactionId]);
                message = 'Transacción de servicio eliminada. Facturas y abonos revertidos.';
                break;

            // --- REQUERIMIENTO 2: Si es 'abono', eliminar el abono ---
            case 'abono':
                if (external_reference) {
                    // a. Eliminar el registro de abono vinculado
                    await connection.query("DELETE FROM abonos WHERE id = ?", [external_reference]);
                }
                
                // b. Eliminar la transacción
                await connection.query("DELETE FROM transactions WHERE id = ?", [transactionId]);
                message = 'Transacción de abono eliminada y registro de abono borrado.';
                break;

            // --- Lógica por defecto para 'support', 'installation', etc. ---
            case 'support':
            case 'installation':
            default:
                // a. Solo eliminar la transacción
                await connection.query("DELETE FROM transactions WHERE id = ?", [transactionId]);
                message = 'Transacción manual eliminada.';
                break;
        }

        // 5. Confirmar los cambios
        await connection.commit();
        res.status(200).json({ message: message });

    } catch (error) {
        await connection.rollback();
        console.error('Error al eliminar transacción:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    } finally {
        connection.release();
    }
};

// --- CONSERVADA: implementación única de updateTransaction (PATCH para actualizar createdAt) ---
export const updateTransaction = async (req, res) => {
    const { id } = req.params;
    const { newDate } = req.body; // Esperamos recibir la nueva fecha en el body

    if (!newDate) {
        return res.status(400).send('Se requiere la nueva fecha (newDate).');
    }

    try {
        // Formatear la fecha al formato MySQL 'YYYY-MM-DD HH:MM:SS'
        const formattedDate = new Date(newDate);
        if (isNaN(formattedDate.getTime())) {
            return res.status(400).send('newDate inválida.');
        }
        const mysqlDate = formattedDate.toISOString().slice(0, 19).replace('T', ' ');

        // Verificar existencia de la transacción
        const [txRows] = await pool.query("SELECT id FROM transactions WHERE id = ?", [id]);
        if (txRows.length === 0) {
            return res.status(404).send('No se encontró la transacción para actualizar.');
        }

        // Actualizar createdAt en transactions
        const updateTxQuery = "UPDATE transactions SET createdAt = ? WHERE id = ?";
        const [result] = await pool.query(updateTxQuery, [mysqlDate, id]);

        if (result.affectedRows === 0) {
            return res.status(404).send('No se encontró la transacción para actualizar.');
        }

        // Además, actualizar createdAt en los pagos asociados para mantener consistencia
        const updatePaymentsQuery = "UPDATE payments SET createdAt = ? WHERE transactionId = ?";
        await pool.query(updatePaymentsQuery, [mysqlDate, id]);

        res.status(200).json({ message: 'Fecha de la transacción y sus pagos actualizada correctamente.' });

    } catch (error) {
        console.error("Error al actualizar la transacción:", error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};