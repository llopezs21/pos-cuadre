import pool from '../db/database.js';
import { randomUUID } from 'crypto';

// --- NUEVA LÍNEA: cargar modelos CommonJS (para resolver payment_method por code) ---
const dbModule = await import('../../models/index.cjs');
const db = dbModule.default || dbModule;
const { PaymentMethod } = db;

// --- NUEVO: importar el calculador ---
const calcModule = await import('../services/paymentCalculator.js');
const { calculatePayment } = calcModule;

// Registra un nuevo abono
export const createAbono = async (req, res) => {
    const { client_mks_id, amount, currency, bcv_rate, notes, payment } = req.body;
    const { userId } = req.user;

    const connection = await pool.getConnection();
    try {
        const [sessions] = await connection.query('SELECT id FROM cashier_sessions WHERE userId = ? AND status = "open"', [userId]);
        if (sessions.length === 0) {
            return res.status(400).send('No tienes una sesión activa.');
        }
        const sessionId = sessions[0].id;

        await connection.beginTransaction();

        // 1. Obtener el nombre del cliente
        const [clients] = await connection.query('SELECT name FROM external_clients WHERE mks_id = ?', [client_mks_id]);
        if (clients.length === 0) {
            throw new Error('Cliente no encontrado');
        }
        const clientName = clients[0].name;

        // --- LÓGICA DE CÁLCULO (movida antes de la inserción) ---
        let payment_method_id = null;
        let payment_method_code = null;
        const providedCode = payment?.payment_method_code || payment?.method || null;

        if (providedCode) {
          const method = await PaymentMethod.findOne({ where: { code: providedCode } });
          if (method) {
            payment_method_id = method.id;
            payment_method_code = method.code;
          } else {
            payment_method_code = providedCode;
          }
        }

        const calcInput = {
          amount: payment?.amount ?? amount,
          currency: currency || 'USD',
          payment_method_code: payment_method_code,
          bcv_rate: bcv_rate ?? payment?.bcvRate ?? null,
          apply_iva: payment?.apply_iva ?? false,
          user_id: userId
        };
        const calc = await calculatePayment(calcInput);
        // --- FIN LÓGICA DE CÁLCULO ---

        // 2. Insertar el registro del abono (para obtener el ID)
        const abonoQuery = 'INSERT INTO abonos (client_mks_id, amount, currency, bcv_rate, notes, created_at_session_id) VALUES (?, ?, ?, ?, ?, ?)';
        const [abonoResult] = await connection.query(abonoQuery, [client_mks_id, amount, currency, calc.bcv_rate || bcv_rate || null, notes, sessionId]);
        
        // ¡LA CLAVE! Obtenemos el ID del abono que acabamos de crear.
        const abonoId = abonoResult.insertId;

        // 3. Crear una transacción de tipo 'abono'
        const transactionId = randomUUID();
        // AÑADIMOS 'external_reference'
        const transactionQuery = 'INSERT INTO transactions (id, clientName, invoiceType, invoiceBaseUSD, notes, sessionId, external_reference) VALUES (?, ?, ?, ?, ?, ?, ?)';
        await connection.query(transactionQuery, [transactionId, clientName, 'abono', amount, notes, sessionId, abonoId]);

        // 4. Insertar el pago
        const paymentQuery = 'INSERT INTO payments (transactionId, method, amount, bcvRate, payment_method_id, payment_method_code) VALUES (?, ?, ?, ?, ?, ?)';
        await connection.query(paymentQuery, [
            transactionId,
            payment?.method || null,
            payment?.amount ?? amount,
            calc.bcv_rate || null,
            calc.payment_method_id || payment_method_id,
            calc.payment_method_code || payment_method_code
        ]);

        await connection.commit();
        res.status(201).json({ message: 'Abono registrado exitosamente.', calculation: calc, abonoId: abonoId });
    } catch (error) {
        await connection.rollback();
        console.error('Error al registrar abono:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    } finally {
        connection.release();
    }
};

// Busca abonos con estado 'disponible' para un cliente
export const getAvailableAbonos = async (req, res) => {
    const { clientMksId } = req.params;
    try {
        const [abonos] = await pool.query(
            "SELECT * FROM abonos WHERE client_mks_id = ? AND status = 'disponible'",
            [clientMksId]
        );
        res.json(abonos);
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
