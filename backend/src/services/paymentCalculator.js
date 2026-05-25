import axios from 'axios';

// Cargar modelos CommonJS desde ESM mediante import dinámico
const dbModule = await import('../../models/index.cjs');
const db = dbModule.default || dbModule;
const { PaymentMethod, PaymentMethodConfig } = db;

// Cargar servicio BCV
const bcvModule = await import('./bcvService.js');
const { getBcvRateForFirstOfMonth } = bcvModule;

const DEFAULT_BCV = Number(process.env.DEFAULT_BCV_RATE) || 36.5;
const DEFAULT_IVA = Number(process.env.IVA_RATE) || 0.16;

/**
 * payload: {
 *   amount: number,
 *   currency: 'USD'|'VES',
 *   payment_method_code?: string,
 *   bcv_rate?: number,
 *   apply_iva?: boolean,           // hint; backend decidirá realmente si aplica según reglas
 *   user_id?: number,
 *   date?: 'YYYY-MM-DD',          // fecha de referencia para BCV
 *   checkout_total_usd?: number   // opcional, para evaluar >50% regla
 * }
 *
 * returns: objeto con bcv_rate, bcv_source, iva_applied y desglose
 */
export const calculatePayment = async (payload) => {
  const {
    amount = 0,
    currency = 'USD',
    payment_method_code: provided_payment_method_code = null,
    bcv_rate: providedBcv = null,
    apply_iva = false,
    user_id = null,
    date = (new Date()).toISOString().split('T')[0],
    checkout_total_usd = null
  } = payload || {};

  // 1) resolver BCV: si viene proporcionada usarla; si no y la moneda es VES, consultar BCV del primer día del mes
  let bcv_rate = providedBcv && Number(providedBcv) > 0 ? Number(providedBcv) : null;
  let bcv_source = bcv_rate ? 'provided' : 'default';

  if (!bcv_rate && currency === 'VES') {
    const { rate, source } = await getBcvRateForFirstOfMonth(date);
    if (rate && Number(rate) > 0) {
      bcv_rate = Number(rate);
      bcv_source = source || 'api';
    } else {
      bcv_rate = DEFAULT_BCV;
      bcv_source = 'fallback_default';
    }
  }
  // Si no es VES y no se proporcionó, usar DEFAULT_BCV only as reference (but not used in conversion)
  if (!bcv_rate) {
    bcv_rate = DEFAULT_BCV;
    bcv_source = 'default';
  }

  // 2) convertir a USD si viene en VES
  let amount_usd = Number(amount || 0);
  if (currency === 'VES') {
    amount_usd = +(Number(amount || 0) / bcv_rate);
  }

  // 3) buscar método de pago y configuración (si aplica)
  let payment_method_id = null;
  let resolved_payment_method_code = provided_payment_method_code;
  let methodDetails = null;
  let methodConfig = null;

  if (resolved_payment_method_code) {
    methodDetails = await PaymentMethod.findOne({ where: { code: resolved_payment_method_code } });
    if (methodDetails) {
      payment_method_id = methodDetails.id;
      resolved_payment_method_code = methodDetails.code;
      methodConfig = await PaymentMethodConfig.findOne({ where: { payment_method_id: methodDetails.id } });
    }
  }

  const commission_percentage = Number(methodConfig?.commission_percentage) || 0;
  const commission_fixed = Number(methodConfig?.commission_fixed) || 0;

  // 4) determinar si aplica IVA según la regla: pagos en VES que representen >50% aplican IVA.
  let iva_applied = false;
  if (currency === 'VES') {
    if (checkout_total_usd && Number(checkout_total_usd) > 0) {
      iva_applied = (amount_usd / Number(checkout_total_usd)) > 0.5;
    } else {
      // si no hay total de checkout, asumimos pago completo -> aplica IVA
      iva_applied = true;
    }
  } else {
    // si viene explicitamente apply_iva true, permitirlo (mantener compatibilidad)
    iva_applied = Boolean(apply_iva);
  }

  // 5) calcular IVA (sobre monto bruto en USD) si corresponde
  const iva_amount = iva_applied ? +(amount_usd * DEFAULT_IVA) : 0;

  // 6) calcular comision
  const commission_amount = +(amount_usd * (commission_percentage / 100) + commission_fixed);

  // 7) montos finales
  const gross_amount_usd = +amount_usd;
  const net_amount_usd = +(gross_amount_usd - commission_amount);
  const total_with_iva_usd = +(net_amount_usd + iva_amount);

  return {
    bcv_rate,
    bcv_source,
    gross_amount_usd,
    amount_usd,
    iva_amount,
    iva_applied,
    commission_amount,
    commission_percentage,
    commission_fixed,
    net_amount_usd,
    total_with_iva_usd,
    payment_method_id,
    payment_method_code: resolved_payment_method_code
  };
};

export default { calculatePayment };