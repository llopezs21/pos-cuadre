import { Box, Paper, Divider, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { UserProfileSection } from './UserProfileSection';
import { ExchangeRatesSummary } from './ExchangeRatesSummary';
import { SessionMetricsSummary } from './SessionMetricsSummary';

interface SidebarProps {
  summary: any;
  onCloseSession?: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}

export const Sidebar = ({ summary, onCloseSession, isMobile = false, onClose }: SidebarProps) => {
  return (
    <Box 
      component={isMobile ? 'div' : Paper}
      elevation={isMobile ? 0 : 3}
      sx={{ 
        width: '320px',
        minHeight: '100vh',
        backgroundColor: '#1e293b', 
        color: '#ffffff',
        padding: 3,
        borderRadius: 0,
        position: isMobile ? 'relative' : 'sticky',
        top: 0
      }}
    >
      {/* Botón de Cerrar (solo en móviles) */}
      {isMobile && onClose && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Menú
          </Typography>
          <IconButton 
            onClick={onClose}
            sx={{ 
              color: '#ffffff',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      )}
      
      {/* Componentes del Sidebar */}
      <UserProfileSection />
      
      <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />
      
      <ExchangeRatesSummary />
      
      <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />
      
      <SessionMetricsSummary 
        summary={summary}
        onCloseSession={onCloseSession}
      />
    </Box>
  );
};
