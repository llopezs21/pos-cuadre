import { Box, Typography, Avatar, CircularProgress, IconButton, Tooltip } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';  // FASE 3: Importar icono de logout
import { useAppStore } from '../../store';
import { useNavigate } from 'react-router-dom';  // FASE 3: Importar navigate

export const UserProfileSection = () => {
  const user = useAppStore(state => state.user);
  const isAuthLoading = useAppStore(state => state.isAuthLoading);
  const logout = useAppStore(state => state.logout);  // FASE 3: Obtener función logout
  const navigate = useNavigate();

  // FASE 3: Handler para logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isAuthLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <CircularProgress size={40} sx={{ color: 'rgba(255,255,255,0.7)' }} />
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          Verificando usuario...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between', width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
          {user?.username?.charAt(0).toUpperCase() || 'U'}
        </Avatar>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#fff' }}>
            {user?.username || 'Usuario Anónimo'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Rol: {user?.role || 'N/A'}
          </Typography>
        </Box>
      </Box>
      
      {/* FASE 3: Botón de Logout junto al perfil */}
      <Tooltip title="Cerrar Sesión" placement="right">
        <IconButton 
          onClick={handleLogout}
          sx={{ 
            color: '#fb923c',  // Color naranja para destacar
            '&:hover': {
              backgroundColor: 'rgba(251,146,60,0.1)',
              color: '#f97316'
            }
          }}
        >
          <LogoutIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
};
