import { useAppStore } from '../store';
import { Navigate, Outlet } from 'react-router-dom';

export const AdminRoute = () => {
  const { isAuthenticated, user } = useAppStore();

  // Si está autenticado y es admin, permite el acceso. Si no, lo redirige al inicio.
  return isAuthenticated && user?.role === 'admin' ? <Outlet /> : <Navigate to="/" />;
};
