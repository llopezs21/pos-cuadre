import { getTransactionsByDate, getSummaryByDate, createTransaction, deleteTransactionById, updateTransactionById, loginUser, getCurrentSession, startSession, closeSession, getSessionsHistory, syncInvoicesFile, syncClientsFile, createAbono, type AbonoData } from './services/api';
import { deleteTransaction as apiDeleteTransaction, updateTransactionDate as apiUpdateTransactionDate } from './services/api';
import type { TransactionPayload, FullTransaction, ClosingData } from './services/api';
import toast from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';
import { create } from 'zustand';
import { getPaymentMethods } from './services/api';

// Reemplaza tu interfaz SummaryData actual por esta:
interface SummaryData {
  totalsByMethod: {
    totalCashUSD: number;
    totalCashVES: number;
    totalPosMiBanco: number;
    totalPosBanesco: number;
  };
  totalsByCategory: {
    totalMikrowispUSD: number;
    totalSupportInstallationUSD: number;
  };
  differences: {
    client: string;
    amount: number;
    notes: string;
  }[];
}

interface PaymentMethod {
  id: number;
  name: string;
  code: string;
  currency: 'USD' | 'VES';
  is_active?: boolean;
  requires_responsable?: boolean;
  generates_commission?: boolean;
  triggers_iva?: boolean; // FASE 3
  is_base_currency?: boolean; // FASE 3
  is_cash?: boolean; // FASE REESTRUCTURACION: Identifica si es efectivo (requiere calculadora de billetes)
}

// FASE 3: Interfaz para configuración global
interface GlobalSettings {
  id: number;
  iva_rate: number;
  iva_threshold: number;
  reconciliation_tolerance: number;
  updated_at: string;
}

interface AppState {
  transactions: FullTransaction[];
  summary: SummaryData | null;
  loading: boolean;
  error: string | null;
  selectedDate: string;
  paymentMethods: PaymentMethod[];
  fetchData: (date: string) => Promise<void>;
  addTransaction: (data: TransactionPayload) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  setSelectedDate: (date: string) => void;
  updateTransactionDate: (transactionId: string, newDate: string) => Promise<void>;
  fetchPaymentMethods: () => Promise<void>;
}

interface AuthState {
  user: { id: number; username: string; role: string } | null;
  token: string | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean; // FASE 2: Flag para controlar estado de carga de autenticación
  login: (data: any) => Promise<void>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>; // FASE 2: Función para obtener usuario actual
}

interface SessionState {
  currentSession: any | null;
  isSessionOpen: boolean;
  getCurrentSession: () => Promise<void>;
  startSession: () => Promise<void>;
  closeSession: (data: ClosingData) => Promise<void>;
}

interface AdminState {
  sessionsHistory: any[];
  fetchSessionsHistory: () => Promise<void>;
}

interface SyncState {
  syncResult: any | null;
  uploadInvoicesFile: (file: File) => Promise<void>;
}

interface ClientSyncState {
  clientSyncResult: any | null;
  uploadClientsFile: (file: File) => Promise<void>;
}

interface BcvState {
  bcvRate: number | null;
  fetchBcvRate: () => Promise<void>;
}

interface AbonoState {
  createAbono: (data: AbonoData) => Promise<void>;
}

interface EditModalState {
  isEditModalOpen: boolean;
  transactionToEdit: any | null;
  openEditModal: (transaction: any) => void;
  closeEditModal: () => void;
}

// FASE 3: Estado de configuración global
interface GlobalSettingsState {
  globalSettings: GlobalSettings | null;
  fetchGlobalSettings: () => Promise<void>;
}

function getUserFromToken(token: string | null) {
  if (!token) return null;
  try {
    const decoded: any = jwtDecode(token);
    return {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}

// --- Mueve esto FUERA del create ---
const initialToken = localStorage.getItem('token');
const initialUser = getUserFromToken(initialToken);

export const useAppStore = create<AppState & AuthState & SessionState & AdminState & SyncState & ClientSyncState & BcvState & AbonoState & EditModalState & GlobalSettingsState>((set, get) => ({
  transactions: [],
  summary: null,
  loading: false,
  error: null,
  selectedDate: new Date().toISOString().split('T')[0],
  
  setSelectedDate: (date: string) => set({ selectedDate: date }),

  fetchData: async (date: string) => {
    set({ loading: true, error: null });
    try {
      const [transactionsRes, summaryRes] = await Promise.all([
        getTransactionsByDate(date),
        getSummaryByDate(date)
      ]);
      set({
  // Ahora transactionsRes.data es el array directamente, como debe ser.
  transactions: transactionsRes.data, 
  summary: summaryRes.data,
  loading: false,
});
    } catch (err) {
      console.error("Error fetching data:", err);
      set({ error: 'Error al cargar los datos.', loading: false });
    }
  },

  addTransaction: async (data: TransactionPayload) => {
    set({ loading: true, error: null });
    try {
      await createTransaction(data);
      toast.success('¡Transacción guardada con éxito!');
      await get().fetchData(get().selectedDate); 
    } catch (err) {
      toast.error('Error al guardar la transacción.');
      set({ error: 'Error al crear la transacción.', loading: false });
    }
  },

  removeTransaction: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await deleteTransactionById(id);
      toast.success('Transacción eliminada.');
      await get().fetchData(get().selectedDate);
    } catch (err) {
      toast.error('Error al eliminar la transacción.');
      set({ error: 'Error al eliminar.', loading: false });
    }
  },

  deleteTransaction: async (transactionId: string) => {
    try {
      await apiDeleteTransaction(transactionId);
      toast.success('Transacción eliminada correctamente.');
      // Vuelve a cargar los datos para refrescar la lista
      get().fetchData(get().selectedDate);
    } catch (error) {
      toast.error('No se pudo eliminar la transacción.');
    }
  },

  isEditModalOpen: false,
  transactionToEdit: null,
  
  openEditModal: (transaction) => {
    set({ isEditModalOpen: true, transactionToEdit: transaction });
  },

  closeEditModal: () => {
    set({ isEditModalOpen: false, transactionToEdit: null });
  },

  saveTransaction: async (id: string, data: any) => {
    set({ loading: true });
    try {
      await updateTransactionById(id, data);
      toast.success('Transacción guardada con éxito.');
      set({ isEditModalOpen: false, transactionToEdit: null });
      await get().fetchData(get().selectedDate);
    } catch (error) {
      toast.error('Error al guardar los cambios.');
    } finally {
      set({ loading: false });
    }
  },

  // --- Estado y acciones de autenticación ---
  token: initialToken,
  user: initialUser,
  isAuthenticated: !!initialToken,
  isAuthLoading: false, // FASE 2: Inicializar como false (ya tenemos token del localStorage)

  // FASE 2: Función para verificar/obtener el usuario actual desde el backend
  fetchCurrentUser: async () => {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      set({ user: null, isAuthLoading: false, isAuthenticated: false });
      return;
    }
    
    set({ isAuthLoading: true });
    try {
      // Endpoint protegido que devuelve el perfil del usuario autenticado
      const response = await fetch('http://localhost:4000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('No autorizado');
      }
      
      const data = await response.json();
      set({ 
        user: data.user, 
        isAuthLoading: false,
        isAuthenticated: true 
      });
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      // Si falla, limpiar la sesión
      localStorage.removeItem('token');
      set({ 
        user: null, 
        isAuthLoading: false,
        isAuthenticated: false,
        token: null
      });
    }
  },

  login: async (data) => {
    try {
      const response = await loginUser(data);
      const { token } = response.data;
      const user = getUserFromToken(token);
      localStorage.setItem('token', token);
      set({ isAuthenticated: true, user, token });
      toast.success('¡Bienvenido!');
      await get().getCurrentSession();
    } catch (error) {
      toast.error('Usuario o contraseña incorrectos.');
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ isAuthenticated: false, user: null, token: null });
    set({ currentSession: null, isSessionOpen: false });
    toast.success('Sesión cerrada.');
  },

  currentSession: null,
  isSessionOpen: false,

  // --- NUEVAS ACCIONES DE SESIÓN ---
  getCurrentSession: async () => {
    try {
      const response = await getCurrentSession();
      set({ currentSession: response.data, isSessionOpen: true });
    } catch (error) {
      // Un error 404 aquí es normal, significa que no hay sesión abierta
      set({ currentSession: null, isSessionOpen: false });
    }
  },

  startSession: async () => {
    try {
      await startSession();
      await get().getCurrentSession(); // Refresca el estado de la sesión
      toast.success('Jornada iniciada exitosamente.');
    } catch (error) {
      toast.error('No se pudo iniciar la jornada.');
    }
  },
  
  closeSession: async (data: ClosingData) => {
    try {
      await closeSession(data);
      set({ currentSession: null, isSessionOpen: false }); // Vuelve al estado inicial
      toast.success('Caja cerrada exitosamente.');
    } catch (error: any) {
      // Muestra el mensaje de error específico del backend (ej. "La caja no cuadra")
      const message = error.response?.data?.message || 'Error al cerrar la caja.';
      toast.error(message);
      throw error; // Lanza el error para que el modal sepa que no debe cerrarse
    }
  },

  sessionsHistory: [],

  fetchSessionsHistory: async () => {
    try {
      const response = await getSessionsHistory();
      set({ sessionsHistory: response.data });
    } catch (error) {
      toast.error('No se pudo cargar el historial de sesiones.');
    }
  },

  syncResult: null,

  uploadInvoicesFile: async (file: File) => {
    set({ loading: true, syncResult: null, error: null });
    try {
      const response = await syncInvoicesFile(file);
      set({ loading: false, syncResult: response.data });
      toast.success('Archivo procesado exitosamente!');
    } catch (error) {
      set({ loading: false, error: 'Error al procesar el archivo.' });
      toast.error('Error al procesar el archivo.');
    }
  },

  clientSyncResult: null,

  uploadClientsFile: async (file: File) => {
    set({ loading: true, clientSyncResult: null, error: null });
    try {
      const response = await syncClientsFile(file);
      set({ loading: false, clientSyncResult: response.data });
      toast.success('Archivo de clientes procesado!');
    } catch (error) {
      set({ loading: false, error: 'Error al procesar el archivo de clientes.' });
      toast.error('Error al procesar el archivo de clientes.');
    }
  },

  bcvRate: null,

  // --- FUNCIÓN CORREGIDA ---
  fetchBcvRate: async () => {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const date = `${year}-${month}-01`; // Fecha del día 01 del mes actual

      // Usamos tu API específica
      const response = await fetch(`https://bcv.minetsystem.com/api/bcv/by-date?date=${date}`);
      
      if (!response.ok) {
        // Si no encuentra la del día 1, busca la más reciente como plan B
        const latestResponse = await fetch(`https://bcv.minetsystem.com/api/bcv/latest`);
        if (!latestResponse.ok) throw new Error('No se pudo obtener la tasa BCV.');
        const latestData = await latestResponse.json();
        set({ bcvRate: Number(latestData.rate) });
        toast.success(`Tasa del día 1 no encontrada. Usando la más reciente: ${latestData.rate}`);
        return;
      }
      
      const data = await response.json();
      const rate = Number(data.rate);

      set({ bcvRate: rate });
      console.log(`Tasa BCV para el ${date} cargada:`, rate);

    } catch (error) {
      console.error("Error al cargar la tasa BCV:", error);
      set({ bcvRate: 36.5 }); // Tasa de emergencia si todo falla
      toast.error('No se pudo cargar la tasa BCV, se usará una por defecto (36.5).');
    }
  },

  createAbono: async (data: AbonoData) => {
    set({ loading: true, error: null });
    try {
      await createAbono(data);
      toast.success('Abono registrado exitosamente.');
      // Opcional: Refrescar los datos del día por si afecta el resumen
      if (get().fetchData && get().selectedDate) {
        get().fetchData(get().selectedDate);
      }
      set({ loading: false });
    } catch (error) {
      set({ loading: false, error: 'Error al registrar el abono.' });
      toast.error('Error al registrar el abono.');
      throw error;
    }
  },

  updateTransactionDate: async (transactionId, newDate) => {
    try {
      await apiUpdateTransactionDate(transactionId, newDate);
      toast.success('Fecha de la transacción actualizada.');
      get().closeEditModal?.(); // Cierra el modal si existe
      // Refresca los datos de la vista actual (si fetchData/selectedDate existen)
      if (typeof get().fetchData === 'function') {
        get().fetchData(get().selectedDate);
      }
    } catch (error) {
      toast.error('No se pudo actualizar la fecha.');
      // opcional: console.error(error);
    }
  },

  paymentMethods: [],
  fetchPaymentMethods: async () => {
    try {
      const resp = await getPaymentMethods();
      set({ paymentMethods: resp.data || [] });
    } catch (err) {
      console.error('Error loading payment methods', err);
      // opcional: toast.error('No se pudieron cargar los métodos de pago.');
    }
  },

  // FASE 3: Estado y acciones de configuración global
  globalSettings: null,
  
  fetchGlobalSettings: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No hay token para obtener configuración global');
        return;
      }

      const response = await fetch('http://localhost:4000/api/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('No se pudo obtener la configuración global');
      }

      const data = await response.json();
      set({ globalSettings: data.data });
      console.log('📊 Configuración global cargada:', data.data);
    } catch (error) {
      console.error('Error al obtener configuración global:', error);
      // Establecer valores por defecto como fallback
      set({
        globalSettings: {
          id: 1,
          iva_rate: 0.16,
          iva_threshold: 0.5,
          reconciliation_tolerance: 0.05,
          updated_at: new Date().toISOString()
        }
      });
    }
  },
}));

export default useAppStore;