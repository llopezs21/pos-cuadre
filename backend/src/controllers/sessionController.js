import pool from '../db/database.js';
import { sendCierreToGieApp } from '../services/gieAppService.js';

// --- FUNCIÓN DE CÁLCULO CORREGIDA ---
const calculateSystemTotalsByMethod = (payments) => {
    const totals = {
        cash_usd: 0,
        cash_ves: 0,
        pos_banesco: 0,
        pos_mibanco: 0
    };

    (payments || []).forEach(p => {
        // Convierte p.amount a número antes de sumar
        const amount = Number(p.amount) || 0;
        switch (p.method) {
            case 'cash_usd':
                totals.cash_usd += amount;
                break;
            case 'cash_ves':
                totals.cash_ves += amount;
                break;
            case 'pos_banesco':
                totals.pos_banesco += amount;
                break;
            case 'pos_mibanco':
                totals.pos_mibanco += amount;
                break;
        }
    });
    return totals;
};

// --- FUNCIÓN DE CÁLCULO #1 ---
// Calcula el total esperado por el sistema en una moneda base (USD)
const calculateSystemTotal = (transactions) => {
    const defaultBcvRate = parseFloat(process.env.DEFAULT_BCV_RATE || 36.5);
    let totalUSD = 0;

    transactions.forEach(tx => {
        // La tabla 'transactions' ahora tiene una columna 'payments' en formato JSON
        const payments = tx.payments || []; 
        payments.forEach(p => {
            switch (p.method) {
                case 'cash_usd':
                    totalUSD += p.amount;
                    break;
                case 'cash_ves':
                case 'pos_banesco':
                case 'pos_mibanco':
                    totalUSD += p.amount / (p.bcvRate || defaultBcvRate);
                    break;
            }
        });
    });
    return totalUSD;
};

// --- FUNCIÓN DE CÁLCULO #2 ---
// Calcula el total reportado por el usuario en una moneda base (USD)
const calculateUserTotal = (closingData) => {
    const defaultBcvRate = parseFloat(process.env.DEFAULT_BCV_RATE || 36.5);
    let totalUSD = 0;

    totalUSD += closingData.cash_usd || 0;
    totalUSD += (closingData.cash_ves || 0) / defaultBcvRate;
    totalUSD += (closingData.banesco_total || 0) / defaultBcvRate;
    totalUSD += (closingData.mibanco_total || 0) / defaultBcvRate;
    
    return totalUSD;
};

// Obtiene la sesión activa del usuario logueado
export const getCurrentSession = async (req, res) => {
    try {
        const [sessions] = await pool.query(
            'SELECT * FROM cashier_sessions WHERE userId = ? AND status = "open"',
            [req.user.userId]
        );
        if (sessions.length > 0) {
            res.json(sessions[0]);
        } else {
            res.status(404).send('No hay sesión activa.');
        }
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error });
    }
};

// Inicia una nueva sesión
export const startSession = async (req, res) => {
    try {
        // Verificar que no haya otra sesión abierta para este usuario
        const [existing] = await pool.query(
            'SELECT * FROM cashier_sessions WHERE userId = ? AND status = "open"',
            [req.user.userId]
        );
        if (existing.length > 0) {
            return res.status(400).send('Ya tienes una sesión activa.');
        }

        const [result] = await pool.query('INSERT INTO cashier_sessions (userId) VALUES (?)', [req.user.userId]);
        res.status(201).json({ message: 'Sesión iniciada.', sessionId: result.insertId });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error });
    }
};

// Cierra la sesión (la lógica más compleja)
export const closeSession = async (req, res) => {
    const { closingData } = req.body; // { cash_usd, cash_ves, ... }
    const { userId } = req.user || {}; // ID del usuario de POS-CUADRE

    const connection = await pool.getConnection();
    try {
        const [sessions] = await connection.query('SELECT * FROM cashier_sessions WHERE userId = ? AND status = "open"', [userId]);
        if (sessions.length === 0) return res.status(404).json({ message: 'No hay sesión abierta para este usuario.' });
        const session = sessions[0];
        const sessionId = session.id;

        // 1. Buscar el GIE_APP username de este usuario en la tabla 'users'
        const [userRows] = await connection.query("SELECT gie_app_username FROM users WHERE id = ?", [userId]);
        if (userRows.length === 0 || !userRows[0].gie_app_username) {
            connection.release();
            return res.status(400).json({ message: "Error: Tu usuario no tiene un 'Responsable GIE-APP' configurado." });
        }
        const gieAppUsername = userRows[0].gie_app_username;

        // (Aquí iría la lógica local de cálculo de systemTotal y discrepancy si existe)
        const systemTotal = 0;
        const discrepancy = 0;

        // Integración con GIE-APP, pasando el username encontrado
        try {
            console.log(`Iniciando sincronización con GIE-APP para session ${sessionId} (Usuario GIE: ${gieAppUsername})`);
            const gieResp = await sendCierreToGieApp(session, gieAppUsername);
            if (!gieResp || (typeof gieResp.success !== 'undefined' && !gieResp.success)) {
                throw new Error(gieResp?.message || 'Respuesta no exitosa de GIE-APP');
            }
            console.log('GIE-APP respuesta OK:', gieResp);
        } catch (err) {
            console.error('Fallo sincronización con GIE-APP:', err.response?.data || err.message || err);
            return res.status(500).json({
                message: `Error sincronizando con GIE-APP: ${err.message || err}`,
                debug_payload: err.payload ?? null,
            });
        }

        // Si GIE-APP tuvo éxito, cerrar la sesión localmente
        await connection.beginTransaction();
        const updateQuery = `
          UPDATE cashier_sessions SET 
            status = 'closed', closedAt = NOW(),
            closing_cash_usd = ?, closing_cash_ves = ?,
            closing_pos_banesco_lote = ?, closing_pos_banesco_total = ?,
            closing_pos_mibanco_lote = ?, closing_pos_mibanco_total = ?,
            closing_mikrowisp_total = ?, system_total_usd = ?, discrepancy = ?
          WHERE id = ?
        `;
        await connection.query(updateQuery, [
          closingData.cash_usd || null,
          closingData.cash_ves || null,
          closingData.banesco_lote || null,
          closingData.banesco_total || null,
          closingData.mibanco_lote || null,
          closingData.mibanco_total || null,
          closingData.mikrowisp || null,
          systemTotal,
          discrepancy,
          sessionId
        ]);
        await connection.commit();

        return res.json({ message: 'Sesión cerrada y sincronizada con GIE-APP.' });
    } catch (error) {
        try { await connection.rollback(); } catch (e) { /* ignore */ }
        console.error('Error al cerrar sesión:', error);
        return res.status(500).json({ message: 'Error cerrando sesión', error: error.message || error });
    } finally {
        connection.release();
    }
};

// --- NUEVA RUTA: Reabrir sesión (solo propietario o admin) ---
export const reopenSession = async (req, res) => {
    const { sessionId } = req.params;
    const { userId, role } = req.user;

    try {
        const [rows] = await pool.query('SELECT * FROM cashier_sessions WHERE id = ?', [sessionId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Sesión no encontrada.' });
        }
        const session = rows[0];

        if (session.status !== 'closed') {
            return res.status(400).json({ message: 'La sesión no está en estado cerrado.' });
        }

        // Permitir reabrir solo si es el dueño de la sesión o un admin
        if (session.userId !== userId && role !== 'admin') {
            return res.status(403).json({ message: 'No tienes permisos para reabrir esta sesión.' });
        }

        await pool.query('UPDATE cashier_sessions SET status = "open", closedAt = NULL WHERE id = ?', [sessionId]);
        res.json({ message: 'Sesión reabierta correctamente.' });
    } catch (error) {
        console.error('Error al reabrir sesión:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

// --- REEMPLAZO: getAllClosedSessions ahora devuelve todas las sesiones (open/closed) excepto la sesión abierta del propio admin ---
export const getAllClosedSessions = async (req, res) => {
	// Obtenemos el ID del admin que hace la petición (sigue disponible si lo necesitas)
	const { userId } = req.user || {};
	if (!userId) {
		return res.status(401).json({ message: 'No autorizado' });
	}

	try {
		// Obtener TODAS las sesiones (abiertas y cerradas).
		// Ordenamos: las abiertas primero, luego por openedAt descendente.
		const query = `
			SELECT s.*, u.username
			FROM cashier_sessions s
			JOIN users u ON s.userId = u.id
			ORDER BY 
			  CASE s.status WHEN 'open' THEN 1 ELSE 2 END,
			  s.openedAt DESC
		`;

		// No pasamos userId como parámetro: queremos todas las sesiones.
		const [sessions] = await pool.query(query);

		// Añadir totales por método para cada sesión
		const detailedSessions = await Promise.all(sessions.map(async (session) => {
			const paymentsQuery = `
				SELECT p.method, p.amount, p.payment_method_code 
				FROM payments p
				JOIN transactions t ON p.transactionId = t.id
				WHERE t.sessionId = ?
			`;
			const [allPayments] = await pool.query(paymentsQuery, [session.id]);

			const systemTotals = calculateSystemTotalsByMethod(allPayments);
			return { ...session, system_totals: systemTotals };
		}));

		res.json(detailedSessions);
	} catch (error) {
		console.error("Error al obtener sesiones:", error);
		res.status(500).json({ message: 'Error en el servidor' });
	}
};

// Obtiene todas las transacciones para una sesión específica
export const getTransactionsForSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const query = `
            SELECT t.id, t.clientName, t.invoiceType, t.invoiceBaseUSD, t.createdAt,
                   JSON_ARRAYAGG(JSON_OBJECT('method', p.method, 'amount', p.amount)) as payments
            FROM transactions t
            LEFT JOIN payments p ON t.id = p.transactionId
            WHERE t.sessionId = ?
            GROUP BY t.id
            ORDER BY t.createdAt DESC;
        `;
        const [transactions] = await pool.query(query, [sessionId]);
        // Parsea los pagos de cada transacción
        const parsed = transactions.map(tx => ({
            ...tx,
            payments: Array.isArray(tx.payments)
                ? tx.payments
                : (typeof tx.payments === 'string' ? JSON.parse(tx.payments) : [])
        }));
        res.json(parsed);
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
};