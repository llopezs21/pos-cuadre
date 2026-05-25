import { Box, Typography, CircularProgress, Divider, Avatar } from '@mui/material';
import { useAppStore } from '../../store';
import PersonIcon from '@mui/icons-material/Person';

export const UserProfileSection = () => {
  const user = useAppStore(state => state.user);
  const isAuthLoading = useAppStore(state => state.isAuthLoading);

  if (isAuthLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
        <CircularProgress size={24} sx={{ color: 'white' }} />
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          Verificando usuario...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
          <PersonIcon />
        </Avatar>
        <Box>
          <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>
            Usuario Activo
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white' }}>
            {user?.username || 'Usuario Anónimo'}
          </Typography>
        </Box>
      </Box>
      
      {user?.role && (
        <Box sx={{ 
          backgroundColor: 'rgba(255,255,255,0.1)', 
          borderRadius: 1, 
          px: 2, 
          py: 1,
          display: 'inline-block'
        }}>
          <Typography variant="caption" sx={{ color: 'white', textTransform: 'uppercase', fontWeight: 600 }}>
            {user.role === 'admin' ? '👑 Administrador' : '📊 Cajero'}
          </Typography>
        </Box>
      )}
      
      <Divider sx={{ mt: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
    </Box>
  );
};
