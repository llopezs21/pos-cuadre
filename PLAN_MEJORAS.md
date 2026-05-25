Step 1.2: Inicialización Síncrona en el Estado del Selector
Modifica el manejador del selector de método de pago (en InvoicePaymentForm.tsx o similar) para que inyecte de forma explícita y forzada la tasa por defecto (DEFAULT_BCV_RATE) en el mismo microtask del cambio de método:

JavaScript
const handleMethodChange = (methodCode: string) => {
  const selectedMethod = paymentMethods.find(m => m.code === methodCode);
  const rateInicial = selectedMethod?.currency === 'VES' ? (store.defaultBcvRate || 1) : 1;
  
  // FORZAR la actualización del método junto con su tasa en un solo bloque atómico
  updateCurrentPayment({
    methodCode,
    currency: selectedMethod?.currency,
    bcvRate: rateInicial,
    amount: currentPayment.amount || 0
  });
};
🔐 Fase 2: Corrección del Usuario "Cargando..." en Barra Superior
🔍 Diagnóstico del Problema
El componente de la UI intenta leer user.username antes de que la petición asíncrona de autenticación o perfil haya finalizado, o bien la acción del Login guarda el token en localStorage pero el Store de Zustand no actualiza la propiedad interna user con la respuesta del Backend, dejándola colgada en su estado de inicialización (loading: true o name: 'Cargando...').

🛠️ Pasos de Corrección a prueba de errores
Step 2.1: Robustecer el Zustand Store (store.ts)
Asegúrate de que la acción de verificación de sesión asigne el objeto completo del usuario y limpie las banderas de carga:

JavaScript
// frontend/src/store.ts
export const useAppStore = create((set) => ({
  user: null,
  isAuthLoading: true,
  
  fetchCurrentUser: async () => {
    set({ isAuthLoading: true });
    try {
      const response = await api.get('/api/auth/me'); // Endpoint de perfil protegido
      set({ user: response.data.user, isAuthLoading: false });
    } catch (error) {
      set({ user: null, isAuthLoading: false });
    }
  }
}));
Step 2.2: Renderizado Seguro en el Componente de la Barra Superior
Modifica el componente visual para manejar estados condicionales y usar encadenamiento opcional (?.):

JavaScript
const UserMenu = () => {
  const { user, isAuthLoading } = useAppStore();

  if (isAuthLoading) {
    return <CircularProgress size={20} color="inherit" />;
  }

  return (
    <Typography variant="subtitle1">
      {user?.username || user?.name || 'Usuario Anónimo'}
    </Typography>
  );
};
📐 Fase 3: Layout Estructural con Sidebar Izquierdo
🔍 Diagnóstico del Problema
Toda la información crítica de métricas del día (Sistemas esperados, Punto Banesco, Mi Banco, Mikrowisp) se encuentra en la parte superior ocupando espacio vertical valioso y forzando scrolls innecesarios en pantallas de POS estándar.

🛠️ Estructura del Nuevo Layout Lateral
Se implementará una cuadrícula envolvente dividida en un panel estático izquierdo de ancho fijo (Sidebar) y un panel dinámico derecho de contenido fluido.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃  MÉTRICAS Y ESTADOS DE SESIÓN   ┃  FORMULARIOS Y TABLAS  ┃
┃  (Sidebar Izquierdo - 300px)   ┃  (Contenido Principal) ┃
┃                                ┃                        ┃
┃  • Info Usuario                ┃  • Registro de Cobro   ┃
┃  • Tasa BCV / Binance          ┃                        ┃
┃  • Totales por Método          ┃  • Tabla de            ┃
┃  • Botón de Cierre de Caja     ┃    Transacciones       ┃
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛠️ Código de Implementación del Layout con Material-UI (MUI)
Reemplaza el contenedor principal en App.tsx utilizando componentes de Grid o Box estructurados:

TypeScript
import { Box, Paper, Divider } from '@mui/material';

const MainLayout = () => {
  return (
    <Box sx={{ display: 'table', width: '100%', minHeight: '100vh', tableLayout: 'fixed' }}>
      {/* PANEL IZQUIERDO: SIDEBAR ESTATICO */}
      <Box 
        component={Paper} 
        elevation={3}
        sx={{ 
          display: 'table-cell', 
          width: '320px', 
          verticalAlign: 'top', 
          backgroundColor: '#1e293b', 
          color: '#ffffff',
          padding: 3,
          borderRadius: 0
        }}
      >
        {/* Componentes del Sidebar */}
        <UserProfileSection />
        <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
        <ExchangeRatesSummary />
        <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
        <SessionMetricsSummary />
      </Box>

      {/* PANEL DERECHO: CONTENIDO OPERATIVO FLUIDO */}
      <Box sx={{ display: 'table-cell', verticalAlign: 'top', padding: 4, backgroundColor: '#f8fafc' }}>
        <Box sx={{ maxWidth: '1200px', margin: '0 auto' }}>
          <InvoicePaymentForm />
          <Box sx={{ mt: 4 }}>
            <TransactionsTable />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
🧱 Fase 4: Individualización e Independencia de Componentes
🔍 Diagnóstico del Problema
Archivos como InvoicePaymentForm.tsx contienen la lógica del formulario, el renderizado de badges de IVA, campos de entrada manual y selectores en una sola estructura monolítica. Esto genera re-renderizados masivos que corrompen el estado intermedio de los inputs en VES.

🛠️ Plan de Descomposición Atómica
Debes instruir a Cursor a romper el archivo monolítico en los siguientes sub-componentes independientes dentro de la carpeta frontend/src/components/payment/:

PaymentMethodSelector.tsx

Responsabilidad: Renderizar exclusivamente el dropdown de métodos disponibles (CASH_USD, POS_BANESCO, etc.).

Estado: Recibe el método seleccionado y dispara la inicialización síncrona de tasa de la Fase 1.

CurrencyAmountInput.tsx

Responsabilidad: Input numérico formateado para el monto cobrado.

Estado: Controla el debouncing del texto ingresado para evitar recalcular con cada pulsación de tecla y evitar bloqueos en entornos Linux antiguos.

VATCalculationsBadge.tsx

Responsabilidad: Cuadro informativo condicional que muestra si aplica la regla del IVA del 16% según el porcentaje de divisas recibido.

Estado: Componente puramente visual (Dumb Component) que recibe props calculadas.