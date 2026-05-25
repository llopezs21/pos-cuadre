import axios from 'axios';

const BCV_API_BASE = process.env.BCV_API_BASE || 'https://bcv.minetsystem.com/api/bcv';
const client = axios.create({ baseURL: BCV_API_BASE, timeout: 5000 });

// Cache simple en memoria: { 'YYYY-MM-DD': { rate: number, fetchedAt: Date } }
const cache = new Map();

/**
 * Obtiene la tasa BCV para una fecha YYYY-MM-DD.
 * Primero consulta la cache; si no existe hace la petición a /by-date y si falla intenta /latest.
 */
export async function getBcvRateForDate(date) {
  if (!date) throw new Error('Date is required');
  if (cache.has(date)) {
    const cached = cache.get(date);
    // cache TTL corto (60 min)
    if (new Date() - cached.fetchedAt < 60 * 60 * 1000) {
      return { rate: cached.rate, source: 'cache' };
    }
  }

  try {
    const resp = await client.get(`/by-date?date=${date}`);
    if (resp?.data?.success && resp.data.rate) {
      const rate = parseFloat(resp.data.rate);
      cache.set(date, { rate, fetchedAt: new Date() });
      return { rate, source: 'api' };
    }
    // Si no encuentra por fecha, intentar latest
    const latest = await client.get('/latest');
    if (latest?.data?.success && latest.data.rate) {
      const rate = parseFloat(latest.data.rate);
      cache.set(date, { rate, fetchedAt: new Date() });
      return { rate, source: 'latest' };
    }
    throw new Error('BCV API returned no rate');
  } catch (err) {
    // No propagar para que el caller haga fallback; retornamos null + source 'error'
    return { rate: null, source: 'error', error: err.message || String(err) };
  }
}

/**
 * Obtiene la tasa BCV para el primer día del mes de una fecha dada (YYYY-MM-DD)
 */
export async function getBcvRateForFirstOfMonth(date) {
  const year = date.substring(0, 4);
  const month = date.substring(5, 7);
  const firstDay = `${year}-${month}-01`;
  return getBcvRateForDate(firstDay);
}

export default { getBcvRateForDate, getBcvRateForFirstOfMonth };
