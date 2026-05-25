import bcvService from '../services/bcvService.js';

/**
 * GET /api/bcv/by-date?date=YYYY-MM-DD
 */
export const getRateByDate = async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ success: false, error: 'El parámetro "date" es requerido.' });

  try {
    const result = await bcvService.getBcvRateForDate(date); // { rate, source, ... }
    if (result?.rate) return res.json({ success: true, rate: result.rate, source: result.source });
    return res.status(404).json({ success: false, error: 'Tasa no encontrada para esa fecha.', source: result?.source });
  } catch (err) {
    console.error('bcv getRateByDate error', err);
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
};

/**
 * GET /api/bcv/first-of-month?date=YYYY-MM-DD
 */
export const getRateFirstOfMonth = async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ success: false, error: 'El parámetro "date" es requerido.' });

  try {
    const result = await bcvService.getBcvRateForFirstOfMonth(date); // { rate, source, ... }
    if (result?.rate) return res.json({ success: true, rate: result.rate, source: result.source });
    return res.status(404).json({ success: false, error: 'Tasa no encontrada para inicio de mes.', source: result?.source });
  } catch (err) {
    console.error('bcv getRateFirstOfMonth error', err);
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
};

/**
 * GET /api/bcv/latest
 */
export const getLatestRate = async (req, res) => {
  try {
    // intentamos obtener la tasa del día; el servicio hará fallback a latest si no hay fecha
    const today = new Date().toISOString().split('T')[0];
    const result = await bcvService.getBcvRateForDate(today);
    if (result?.rate) return res.json({ success: true, rate: result.rate, source: result.source });
    return res.status(404).json({ success: false, error: 'No se encontró tasa.', source: result?.source });
  } catch (err) {
    console.error('bcv getLatestRate error', err);
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
};