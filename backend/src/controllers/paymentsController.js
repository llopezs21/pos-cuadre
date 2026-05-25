import pool from '../db/database.js';
import { randomUUID } from 'crypto';

// Cargar modelos CommonJS desde ESM
const dbModule = await import('../../models/index.cjs');
const db = dbModule.default || dbModule;
const { PaymentMethod } = db;

// Cargar servicio de cálculo
const calcModule = await import('../services/paymentCalculator.js');
const { calculatePayment } = calcModule;

// Helper: obtener sesión abierta del usuario
async function getOpenSessionId(connection, userId) {
  const [rows] = await connection.query('SELECT id FROM cashier_sessions WHERE userId = ? AND status = "open"', [userId]);
  return rows.length ? rows[0].id : null;
}

// Crear pago genérico (internal)
async function createPaymentInternal({ userId, invoiceType, clientName, invoiceBaseUSD, notes, paymentPayload }) {
  const connection = await pool.getConnection();
  try {
    const sessionId = await getOpenSessionId(connection, userId);
    if (!sessionId) throw new Error('No tienes una sesión activa.');

    await connection.beginTransaction();

    const transactionId = randomUUID();
    const transactionQuery = 'INSERT INTO transactions (id, clientName, invoiceType, invoiceBaseUSD, notes, sessionId) VALUES (?, ?, ?, ?, ?, ?)';
    await connection.query(transactionQuery, [transactionId, clientName, invoiceType, invoiceBaseUSD, notes || null, sessionId]);

    // Resolver payment_method_code si viene
    let payment_method_id = null;
    let payment_method_code = paymentPayload?.payment_method_code || paymentPayload?.method || null;
    if (payment_method_code) {
      const method = await PaymentMethod.findOne({ where: { code: payment_method_code } });
      if (method) {
        payment_method_id = method.id;
        payment_method_code = method.code;
      }
    }

    // Calcular BCV/IVA/Comisión en el backend
    const calcInput = {
      amount: paymentPayload?.amount ?? invoiceBaseUSD,
      currency: paymentPayload?.currency ?? 'USD',
      payment_method_code: payment_method_code,
      bcv_rate: paymentPayload?.bcvRate ?? null,
      apply_iva: paymentPayload?.apply_iva ?? false,
      user_id: userId
    };
    const calc = await calculatePayment(calcInput);

    // Insertar payment usando valores calculados
    const paymentQuery = 'INSERT INTO payments (transactionId, method, amount, bcvRate, payment_method_id, payment_method_code) VALUES (?, ?, ?, ?, ?, ?)';
    await connection.query(paymentQuery, [
      transactionId,
      paymentPayload?.method || null, // legacy
      paymentPayload?.amount ?? invoiceBaseUSD,
      calc.bcv_rate || null,
      calc.payment_method_id || payment_method_id,
      calc.payment_method_code || payment_method_code
    ]);

    await connection.commit();
    return { transactionId, calc };
  } catch (err) {
    try { await connection.rollback(); } catch (e) { /* ignore */ }
    throw err;
  } finally {
    connection.release();
  }
}

// POST /api/payments/service  -> COBRARFACTURAS
export const createServicePayment = async (req, res) => {
  try {
    const { clientName, invoiceBaseUSD, notes, payment } = req.body;
    const userId = req.user?.userId || req.user?.id; // ajusta según auth
    if (!userId) return res.status(401).json({ message: 'No autorizado' });

    const result = await createPaymentInternal({
      userId,
      invoiceType: 'service',
      clientName: clientName || 'Cliente',
      invoiceBaseUSD: invoiceBaseUSD ?? 0,
      notes,
      paymentPayload: payment || {}
    });

    return res.status(201).json({ message: 'Pago de servicio registrado', transactionId: result.transactionId, calculation: result.calc });
  } catch (err) {
    console.error('createServicePayment error', err);
    return res.status(500).json({ message: err.message || 'Error al crear pago de servicio' });
  }
};

// POST /api/payments/manual  -> REGISTRO MANUAL / instalación
export const createManualPayment = async (req, res) => {
  try {
    const { clientName, invoiceBaseUSD, notes, payment } = req.body;
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.status(401).json({ message: 'No autorizado' });

    const result = await createPaymentInternal({
      userId,
      invoiceType: 'installation',
      clientName: clientName || 'Cliente',
      invoiceBaseUSD: invoiceBaseUSD ?? 0,
      notes,
      paymentPayload: payment || {}
    });

    return res.status(201).json({ message: 'Pago manual registrado', transactionId: result.transactionId, calculation: result.calc });
  } catch (err) {
    console.error('createManualPayment error', err);
    return res.status(500).json({ message: err.message || 'Error al crear pago manual' });
  }
};
