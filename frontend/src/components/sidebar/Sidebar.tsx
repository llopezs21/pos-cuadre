import { Box, Paper, Button } from '@mui/material';
import { UserProfileSection } from './UserProfileSection';
import { ExchangeRatesSummary } from './ExchangeRatesSummary';
import { SessionMetricsSummary } from './SessionMetricsSummary';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAppStore } from '../../store';

interface SidebarProps {
  summary?: {
    totalsByMethod: {
      totalCashUSD: number;
      totalCashVES: number;
      totalPosBanesco: number;
      totalPosMiBanco: number;
    };
    totalsByCategory?: {
      totalMikrowispUSD: number;
      totalSupportInstallationUSD: number;
    };
  } | null;
  onCloseSession?: () => void;
}

export const Sidebar = ({ summary, onCloseSession }: SidebarProps) => {
  const logout = useAppStore(state => state.logout);
  const isSessionOpen = useAppStore(state => state.isSessionOpen);

  return (
    <Box 
      component={Paper} 
      elevation={4}
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        width: '320px', 
        minHeight: '100vh',
        backgroundColor: '#1e293b', 
        color: '#ffffff',
        borderRadius: 0,
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
        maxHeight: '100vh'
      }}
    >
      {/* User Profile Section */}
      <UserProfileSection />
      
      {/* Exchange Rates Section */}
      <ExchangeRatesSummary />
      
      {/* Session Metrics Section */}
      {isSessionOpen && <SessionMetricsSummary summary={summary} />}
      
      {/* Action Buttons */}
      <Box sx={{ mt: 'auto', p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        {isSessionOpen && onCloseSession && (
          <Button 
            variant="contained" 
            color="warning" 
            fullWidth 
            sx={{ mb: 1 }}
            onClick={onCloseSession}
          >
            Cerrar Caja
          </Button>
        )}
        <Button 
          variant="outlined" 
          fullWidth
          startIcon={<LogoutIcon />}
          onClick={logout}
          sx={{ 
            color: 'white', 
            borderColor: 'rgba(255,255,255,0.3)',
            '&:hover': {
              borderColor: 'rgba(255,255,255,0.6)',
              backgroundColor: 'rgba(255,255,255,0.05)'
            }
          }}
        >
          Cerrar Sesión
        </Button>
      </Box>
    </Box>
  );
};
