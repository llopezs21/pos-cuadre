import pool from '../db/database.js';

const getRechargeCommissionPercent = async () => {
  const [rows] = await pool.query(
    'SELECT recharge_commission_percent FROM global_settings WHERE id = 1'
  );
  return Number(rows[0]?.recharge_commission_percent ?? 10);
};

const getOpenSessionForUser = async (userId) => {
  const [sessions] = await pool.query(
    'SELECT * FROM cashier_sessions WHERE userId = ? AND status = "open" LIMIT 1',
    [userId]
  );
  return sessions[0] || null;
};

export const listRecharges = async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    if (!sessionId) {
      return res.status(400).json({ message: 'session_id es requerido' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM recharges WHERE session_id = ? ORDER BY created_at DESC',
      [sessionId]
    );
    return res.json(rows);
  } catch (err) {
    console.error('listRecharges error', err);
    return res.status(500).json({ message: 'Error al listar recargas' });
  }
};

export const createRecharge = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'No autorizado' });

    const session = await getOpenSessionForUser(userId);
    if (!session) {
      return res.status(400).json({ message: 'Debe tener una jornada activa para registrar recargas' });
    }

    const {
      phone_number,
      is_staff = false,
      net_amount_bs,
      commission_amount_bs,
      payment_method,
      currency,
      amount_tendered,
      exchange_rate,
    } = req.body;

    const net = Number(net_amount_bs);
    if (!phone_number || !Number.isFinite(net) || net <= 0) {
      return res.status(400).json({ message: 'Teléfono y monto neto válido son obligatorios' });
    }

    const normalizedPhone = String(phone_number).replace(/\D/g, '');
    const staffFlag = Boolean(is_staff);

    let commission = Number(commission_amount_bs);
    if (!Number.isFinite(commission) || commission < 0) {
      const percent = await getRechargeCommissionPercent();
      commission = +(net * (percent / 100)).toFixed(2);
    }

    const totalCharged = staffFlag ? 0 : +(net + commission).toFixed(2);

    if (!staffFlag) {
      if (!payment_method || !currency || amount_tendered == null) {
        return res.status(400).json({
          message: 'Recargas de clientes requieren método de pago, moneda y monto entregado',
        });
      }
    }

    const [result] = await pool.query(
      `INSERT INTO recharges (
        session_id, phone_number, is_staff, net_amount_bs, commission_amount_bs,
        total_charged, payment_method, currency, amount_tendered, exchange_rate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        normalizedPhone,
        staffFlag,
        net,
        commission,
        totalCharged,
        staffFlag ? null : payment_method,
        staffFlag ? null : currency,
        staffFlag ? null : Number(amount_tendered),
        exchange_rate != null ? Number(exchange_rate) : null,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM recharges WHERE id = ?', [result.insertId]);
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('createRecharge error', err);
    return res.status(500).json({ message: 'Error al registrar recarga' });
  }
};
