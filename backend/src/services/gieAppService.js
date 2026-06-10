import axios from 'axios';
import pool from '../db/database.js';

const dbModule = await import('../../models/index.cjs');
const db = dbModule.default || dbModule;

const GIE_API_HOST = process.env.GIE_API_HOST;
const GIE_CLIENT_ID = process.env.GIE_CLIENT_ID;
const GIE_CLIENT_SECRET = process.env.GIE_CLIENT_SECRET;

let machineToken = null;
let tokenExpires = new Date(0);

const getMachineToken = async () => {
  if (machineToken && new Date() < tokenExpires) return machineToken;
  try {
    const resp = await axios.post(`${GIE_API_HOST}/api/auth/machine-token`, {
      client_id: GIE_CLIENT_ID,
      client_secret: GIE_CLIENT_SECRET
    });
    machineToken = resp.data.accessToken || resp.data.token || null;
    tokenExpires = new Date(new Date().getTime() + 50 * 60 * 1000); // 50 minutos
    return machineToken;
  } catch (err) {
    console.error('Error al obtener token de máquina GIE-APP:', err.response?.data || err.message || err);
    throw new Error('No se pudo autenticar con GIE-APP.');
  }
};

export const sendCierreToGieApp = async (session, usuarioGieApp) => {
  const sessionId = session.id;
  const connection = await pool.getConnection();
  let payload = null;

  try {
    const paymentsQuery = `
      SELECT p.payment_method_code, p.method, p.amount
      FROM payments p
      JOIN transactions t ON p.transactionId = t.id
      WHERE t.sessionId = ?
    `;
    const [allPayments] = await connection.query(paymentsQuery, [sessionId]);

    const paymentsByCode = allPayments.reduce((acc, p) => {
      const code = p.payment_method_code || p.method || 'UNKNOWN';
      if (!acc[code]) acc[code] = { total_amount: 0, method_code: code };
      acc[code].total_amount += Number(p.amount || 0);
      return acc;
    }, {});

    const detalles_pagos = await Promise.all(Object.values(paymentsByCode).map(async (entry) => {
      const methodDetails = await db.PaymentMethod.findOne({ where: { code: entry.method_code } });
      if (!methodDetails) {
        console.warn(`GIE-APP: No se encontró PaymentMethod para el código: ${entry.method_code}`);
        return null;
      }

      let comision_porcentaje = 0;

      if (methodDetails.requires_responsable !== false && methodDetails.requires_responsable !== 0) {
        const methodConfig = await db.PaymentMethodConfig.findOne({
          where: { payment_method_id: methodDetails.id }
        });
        if (!methodConfig || !methodConfig.username) {
          console.warn(`GIE-APP: Falta configuración para ${methodDetails.name}. Omitiendo este método.`);
          return null;
        }
        comision_porcentaje = Number(methodConfig.commission_percentage) || 0;
      }

      const monto_bruto = Number(entry.total_amount || 0);
      const comision_monto = +(monto_bruto * (comision_porcentaje / 100)).toFixed(2);
      const monto_neto = +(monto_bruto - comision_monto).toFixed(2);

      return {
        metodo_pago: methodDetails.name,
        monto_neto,
        divisa: methodDetails.currency
      };
    }));

    const detallesFiltrados = detalles_pagos.filter(Boolean);

    const [rechargeRows] = await connection.query(
      `SELECT COALESCE(SUM(net_amount_bs), 0) AS total_net
       FROM recharges WHERE session_id = ?`,
      [sessionId]
    );
    const totalNetRecharges = Number(rechargeRows[0]?.total_net || 0);

    if (totalNetRecharges > 0) {
      detallesFiltrados.push({
        metodo_pago: 'Recargas de Saldo (Prepago)',
        monto_neto: -Math.abs(totalNetRecharges),
        divisa: 'VES'
      });
    }

    if (detallesFiltrados.length === 0) {
      console.log('GIE-APP: No hay pagos ni recargas que sincronizar con sync-cierre.');
      return { success: true, message: 'Cierre local completado. Nada que sincronizar con GIE-APP.' };
    }

    payload = {
      cierre_id: String(sessionId),
      usuario_pos: usuarioGieApp,
      detalles_pagos: detallesFiltrados
    };

    console.log('===================================================');
    console.log('🚀 ENVIANDO APUNTE DE RECARGAS A GIE-APP (sync-cierre) 🚀');
    console.log(JSON.stringify(payload, null, 2));
    console.log('===================================================');

    const token = await getMachineToken();
    if (!token) {
      const err = new Error('No se obtuvo token de GIE-APP');
      err.payload = payload;
      throw err;
    }

    const resp = await axios.post(`${GIE_API_HOST}/api/transactions/sync-cierre`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return resp.data;
  } catch (error) {
    if (payload && !error.payload) {
      error.payload = payload;
    }
    if (error.response && error.response.data) {
      console.error('Error en sendCierreToGieApp (Respuesta GIE):', error.response.data);
      const err = new Error(error.response.data.message || 'Error en GIE-APP');
      err.payload = error.payload || payload;
      throw err;
    }
    console.error('Error en sendCierreToGieApp (Error Local):', error.message || error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};
