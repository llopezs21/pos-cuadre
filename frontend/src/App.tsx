import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { AdminSessionsPage } from './pages/AdminSessionsPage';
import { Toaster } from 'react-hot-toast';
import { EditTransactionModal } from './components/EditTransactionModal';
import { AdminSyncPage } from './pages/AdminSyncPage';
import { AdminConfigPage } from './pages/AdminConfigPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { BusinessRulesPage } from './pages/BusinessRulesPage';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'; // FASE 1: ThemeProvider global

// FASE 1: Tema Oscuro Global
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0f172a', // Fondo principal (slate-900)
      paper: '#1e293b',   // Fondo de tarjetas/modales (slate-800)
    },
    primary: {
      main: '#60a5fa', // Azul
    },
    secondary: {
      main: '#fb923c', // Naranja
    },
    success: {
      main: '#4ade80', // Verde
    },
    text: {
      primary: '#f1f5f9',   // Texto principal
      secondary: '#cbd5e1', // Texto secundario
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline /> {/* FASE 1: Fuerza CSS global, destruye fondo gris nativo */}
      <BrowserRouter>
        <Toaster position="top-center" reverseOrder={false} />
        <EditTransactionModal />

        <Routes>
          {/* Ruta pública */}
          <Route path="/login" element={<LoginPage />} />

          {/* 1. Rutas que requieren SÓLO login (Protegidas) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
          </Route>

          {/* 2. Rutas que requieren LOGIN y ROL ADMIN */}
          <Route element={<ProtectedRoute />}> {/* Valida Login */}
            <Route element={<AdminRoute />}>   {/* Valida Rol Admin */}
              <Route path="/admin/sessions" element={<AdminSessionsPage />} />
              <Route path="/admin/sync" element={<AdminSyncPage />} />
              <Route path="/admin/config" element={<AdminConfigPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/business-rules" element={<BusinessRulesPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;