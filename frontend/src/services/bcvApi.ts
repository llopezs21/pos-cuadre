import axios from 'axios';

// La URL base local (proxy o mismo origen). Asegúrate de que el frontend haga peticiones al mismo host/puerto o configure proxy.
const apiClient = axios.create({
  baseURL: '', // usa origen actual; si tu frontend corre en diferente puerto, ajusta con REACT_APP_API_BASE
});

/**
 * Obtiene la tasa BCV para una fecha específica.
 * @param date - La fecha en formato YYYY-MM-DD.
 */
export const getBcvRateForDate = async (date: string): Promise<number> => {
  try {
    const response = await apiClient.get(`/api/bcv/by-date?date=${date}`);
    if (response.data && response.data.success) {
      return parseFloat(response.data.rate);
    }
    throw new Error('No se pudo obtener la tasa para la fecha.');
  } catch (error) {
    console.error(`Error fetching BCV rate for ${date}:`, error);
    throw error; // Propagamos el error para que el componente lo maneje
  }
};

/**
 * Obtiene la tasa BCV del primer día del mes para la fecha proporcionada.
 * @param date - Fecha de referencia YYYY-MM-DD (opcional). Si no se provee, se usa hoy.
 */
export const getBcvRateForFirstOfMonth = async (date?: string): Promise<number> => {
  try {
    const qDate = date || new Date().toISOString().split('T')[0];
    const resp = await apiClient.get(`/api/bcv/first-of-month?date=${encodeURIComponent(qDate)}`);
    if (resp?.data && (resp.data.rate || resp.data.rate === 0)) {
      const rate = Number(resp.data.rate);
      if (!isNaN(rate) && rate > 0) return rate;
      throw new Error('La API devolvió una tasa inválida');
    }
    throw new Error(resp?.data?.error || 'No se obtuvo tasa BCV');
  } catch (err) {
    console.error('Error obteniendo tasa BCV desde backend:', err);
    throw err;
  }
};