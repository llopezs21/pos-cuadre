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

function App() {
  return (
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
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;