import axios from 'axios';
import { useAppStore } from '../store'; // Importa el store

// Vite accede a las variables de entorno a través de `import.meta.env`
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- TIPOS DEFINIDOS Y EXPORTADOS CORRECTAMENTE ---

export interface Payment {
  method: 'cash_usd' | 'cash_ves' | 'pos_mibanco' | 'pos_banesco';
  amount: number;
  bcvRate?: number;
}

// Payload para crear o actualizar una transacción
export interface TransactionPayload {
  clientName: string;
  invoiceType: 'service' | 'support' | 'installation';
  invoiceBaseUSD: number;
  notes?: string;
  payments: Payment[];
  createdAt: string;
}

// Tipo para una transacción completa que viene de la BD
export interface FullTransaction extends TransactionPayload {
  id: string;
}

// Añade esta interfaz para tipar los datos del cierre
export interface ClosingData {
  cash_usd: number;
  cash_ves: number;
  banesco_lote: string;
  banesco_total: number;
  mibanco_lote: string;
  mibanco_total: number;
  mikrowisp: number;
}

// Interfaz para los datos del abono
export interface AbonoData {
  client_mks_id: number;
  amount: number;
  currency: 'USD' | 'VES';
  bcv_rate?: number;
  notes?: string;
  payment: {
    method: 'cash_usd' | 'cash_ves' | 'pos_banesco' | 'pos_mibanco';
    amount: number;
    bcvRate?: number;
  };
}

// --- Funciones de la API ---

export const getTransactionsByDate = (date: string) => {
  // Le decimos a TypeScript que la data de la respuesta es directamente un array de FullTransaction
  return apiClient.get<FullTransaction[]>(`/transactions?date=${date}`);
};

export const getSummaryByDate = (date: string) => {
  return apiClient.get(`/summary?date=${date}`);
};

export const createTransaction = (data: TransactionPayload) => {
  return apiClient.post('/transactions', data);
};

export const updateTransactionById = (id: string, data: TransactionPayload) => {
  return apiClient.put(`/transactions/${id}`, data);
};

export const deleteTransactionById = (id: string) => {
  return apiClient.delete(`/transactions/${id}`);
};

// Nueva función para el login
export const loginUser = (data: any) => apiClient.post('/auth/login', data);

// --- NUEVAS FUNCIONES PARA SESIONES ---

export const getCurrentSession = () => {
  return apiClient.get('/sessions/current');
};

export const startSession = () => {
  return apiClient.post('/sessions/start');
};

export const closeSession = (closingData: ClosingData) => {
  return apiClient.post('/sessions/close', { closingData });
};

export const getSessionsHistory = () => {
  return apiClient.get('/sessions');
};

export const getTransactionsBySessionId = (sessionId: number) => {
  return apiClient.get(`/sessions/${sessionId}/transactions`);
};

// Nueva función para enviar el archivo de facturas al backend
export const syncInvoicesFile = (file: File) => {
  const formData = new FormData();
  formData.append('invoicesFile', file);
  return apiClient.post('/sync/invoices', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const syncClientsFile = (file: File) => {
  const formData = new FormData();
  formData.append('clientsFile', file);
  return apiClient.post('/sync/clients', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const searchClients = (query: string) => apiClient.get(`/search/clients?query=${query}`);
export const getUnpaidInvoices = (clientMksId: number) => apiClient.get(`/search/clients/${clientMksId}/unpaid-invoices`);
export const deleteTransaction = (transactionId: string) => apiClient.delete(`/transactions/${transactionId}`);
export const createAbono = (data: AbonoData) => {
  return apiClient.post('/abonos', data);
};

export const getAvailableAbonos = (clientMksId: number) => {
  return apiClient.get(`/abonos/client/${clientMksId}/available`);
};

// Nueva función para actualizar parcialmente una transacción
export const updateTransactionDate = (transactionId: string, newDate: string) => {
  // Usamos PATCH para la actualización parcial
  return apiClient.patch(`/transactions/${transactionId}`, { newDate });
};

export const getPaymentMethods = () => {
  // Endpoint expuesto por paymentMethodController.listPaymentMethods
  return apiClient.get('/payment-methods');
};

// --- AÑADIR: obtener todas las sesiones (historial) para admin ---
export const getAllSessions = () => {
  // Ajusta la ruta si tu servidor expone otra (ej: /sessions/history)
  return apiClient.get('/sessions/history');
};

// getTransactionsBySessionId ya existe más arriba como getTransactionsBySessionId

/**
 * Obtiene la tasa BCV para el día de HOY.
 * Usada por ManualEntryForm.
 */
export const getDailyBcvRate = async (): Promise<number> => {
  const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

  try {
    // Llama al endpoint del backend (que usa bcvService.js)
    const response = await apiClient.get(`/bcv/by-date?date=${today}`);

    if (response.data?.success && response.data?.rate) {
      const rate = parseFloat(response.data.rate);
      if (!isNaN(rate) && rate > 0) return rate;
    }

    // Fallback a 'latest' si 'by-date' falla
    const latestResp = await apiClient.get('/api/bcv/latest');
    if (latestResp.data?.success && latestResp.data?.rate) {
       const rate = parseFloat(latestResp.data.rate);
       if (!isNaN(rate) && rate > 0) return rate;
    }
    throw new Error('No se pudo obtener la tasa BCV del día.');

  } catch (error) {
    console.error(`Error fetching daily BCV rate:`, error);
    throw error;
  }
};

/**
 * Obtiene la tasa BCV del primer día del mes para la fecha proporcionada.
 * Usada por InvoicePaymentForm y AbonoForm.
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
    console.error('Error obteniendo tasa BCV (inicio de mes) desde backend:', err);
    throw err;
  }
};

// --- FIN DE FUNCIONES AÑADIDAS ---

// --- API PARA CONFIGURACIÓN DE MÉTODOS DE PAGO ---
export const getPaymentConfigs = () => {
  return apiClient.get('/payment-configs');
};

export const updatePaymentConfig = (data: {
  payment_method_id: number;
  username: string;
  commission_percentage?: number;
  user_id?: number;
}) => {
  return apiClient.post('/payment-configs', data);
};
// --- FIN: API PARA CONFIGURACIÓN --- 

// --- ADMIN USERS API ---
export const getUsers = () => {
  return apiClient.get('/admin/users');
};

export const updateUserGieUsername = (id: number, gie_app_username: string | null) => {
  return apiClient.put(`/admin/users/${id}/gie-username`, { gie_app_username });
};

// --- INTERCEPTOR ---
// Esto se ejecuta ANTES de cada petición
apiClient.interceptors.request.use(
  (config) => {
    const token = useAppStore.getState().token; // Obtiene el token del store
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);