import axios from 'axios';
import pool from '../db/database.js';

// Cargar modelos CommonJS
const dbModule = await import('../../models/index.cjs');
const db = dbModule.default || dbModule;

const GIE_API_HOST = process.env.GIE_API_HOST;
const GIE_CLIENT_ID = process.env.GIE_CLIENT_ID;
const GIE_CLIENT_SECRET = process.env.GIE_CLIENT_SECRET;

let machineToken = null;
let tokenExpires = new Date(0);

// --- (Función getMachineToken ... déjala como está) ---
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

// --- REEMPLAZO: sendCierreToGieApp (LÓGICA HÍBRIDA) ---
export const sendCierreToGieApp = async (session, usuarioGieApp) => {
  const sessionId = session.id;
  const connection = await pool.getConnection();

  try {
    // 1. Obtener pagos de la sesión
    const paymentsQuery = `
      SELECT p.payment_method_code, p.method, p.amount
      FROM payments p
      JOIN transactions t ON p.transactionId = t.id
      WHERE t.sessionId = ?
    `;
    const [allPayments] = await connection.query(paymentsQuery, [sessionId]);

    // 2. Agrupar por código
    const paymentsByCode = allPayments.reduce((acc, p) => {
      const code = p.payment_method_code || p.method || 'UNKNOWN';
      if (!acc[code]) acc[code] = { total_amount: 0, method_code: code };
      acc[code].total_amount += Number(p.amount || 0);
      return acc;
    }, {});

    // 3. Lógica híbrida de responsables
    const detalles_pagos = await Promise.all(Object.values(paymentsByCode).map(async (entry) => {
      const methodDetails = await db.PaymentMethod.findOne({ where: { code: entry.method_code } });
      if (!methodDetails) {
        console.warn(`GIE-APP: No se encontró PaymentMethod para el código: ${entry.method_code}`);
        return null;
      }

      let responsable_metodo = '';
      let comision_porcentaje = 0;

      if (methodDetails.requires_responsable === false || methodDetails.requires_responsable === 0) {
        // Efectivo u otros métodos marcados como no requieren responsable -> usar usuario GIE de la sesión
        responsable_metodo = usuarioGieApp;
        comision_porcentaje = 0;
      } else {
        // Para POS/otros: leer configuración estática
        const methodConfig = await db.PaymentMethodConfig.findOne({
          where: { payment_method_id: methodDetails.id }
        });
        if (!methodConfig || !methodConfig.username) {
          console.warn(`GIE-APP: Falta configuración para ${methodDetails.name}. Omitiendo este método.`);
          return null;
        }
        responsable_metodo = methodConfig.username;
        comision_porcentaje = Number(methodConfig.commission_percentage) || 0;
      }

      const monto_bruto = Number(entry.total_amount || 0);
      const comision_monto = +(monto_bruto * (comision_porcentaje / 100)).toFixed(2);
      const monto_neto = +(monto_bruto - comision_monto).toFixed(2);

      return {
        metodo_pago: methodDetails.name,
        monto_bruto,
        monto_neto,
        divisa: methodDetails.currency,
        responsable_metodo,
        aplica_comision: comision_porcentaje > 0,
        comision_porcentaje,
        comision_monto,
        numero_lote: String(sessionId),
        categoria: comision_porcentaje > 0 ? 'Comisiones Bancarias' : undefined
      };
    }));

    const detallesFiltrados = detalles_pagos.filter(Boolean);

    if (detallesFiltrados.length === 0) {
      console.log('GIE-APP: No hay detalles de pago configurados para enviar.');
      return { success: true, message: 'Cierre local completado. Nada que sincronizar con GIE-APP (sin configuración).' };
    }

    const payload = {
      cierre_id: String(sessionId),
      fecha_cierre: (session.openedAt ? new Date(session.openedAt) : new Date()).toISOString().split('T')[0],
      usuario_pos: usuarioGieApp,
      detalles_pagos: detallesFiltrados
    };

    const token = await getMachineToken();
    if (!token) throw new Error('No se obtuvo token de GIE-APP');

    const resp = await axios.post(`${GIE_API_HOST}/api/gie-app/cargar-fondos`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return resp.data;
  } catch (error) {
    if (error.response && error.response.data) {
      console.error('Error en sendCierreToGieApp (Respuesta GIE):', error.response.data);
      throw new Error(error.response.data.message || 'Error en GIE-APP');
    }
    console.error('Error en sendCierreToGieApp (Error Local):', error.message || error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};
