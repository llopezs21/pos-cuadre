import { Box, Typography, Paper, Button } from '@mui/material';
import { useAppStore } from '../../store';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';

interface SessionMetricsSummaryProps {
  summary: any;
  onCloseSession?: () => void;
}

export const SessionMetricsSummary = ({ summary, onCloseSession }: SessionMetricsSummaryProps) => {
  const isSessionOpen = useAppStore(state => state.isSessionOpen);

  if (!summary) {
    return (
      <Box>
        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>
          Métricas del Día
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 1 }}>
          Sin datos disponibles
        </Typography>
      </Box>
    );
  }

  const { totalsByMethod, totalsByCategory } = summary;

  return (
    <Box>
      <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>
        Métricas del Día
      </Typography>

      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Totales por Método */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            bgcolor: 'rgba(255,255,255,0.05)',
            borderRadius: 2
          }}
        >
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AttachMoneyIcon sx={{ fontSize: 16 }} />
            Efectivo USD
          </Typography>
          <Typography variant="h6" sx={{ color: '#10b981', fontWeight: 'bold' }}>
            ${totalsByMethod?.totalCashUSD?.toFixed(2) || '0.00'}
          </Typography>
        </Paper>

        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            bgcolor: 'rgba(255,255,255,0.05)',
            borderRadius: 2
          }}
        >
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AttachMoneyIcon sx={{ fontSize: 16 }} />
            Efectivo VES
          </Typography>
          <Typography variant="h6" sx={{ color: '#f59e0b', fontWeight: 'bold' }}>
            {totalsByMethod?.totalCashVES?.toFixed(2) || '0.00'} Bs
          </Typography>
        </Paper>

        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            bgcolor: 'rgba(255,255,255,0.05)',
            borderRadius: 2
          }}
        >
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PointOfSaleIcon sx={{ fontSize: 16 }} />
            Punto Banesco
          </Typography>
          <Typography variant="h6" sx={{ color: '#3b82f6', fontWeight: 'bold' }}>
            {totalsByMethod?.totalPosBanesco?.toFixed(2) || '0.00'} Bs
          </Typography>
        </Paper>

        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            bgcolor: 'rgba(255,255,255,0.05)',
            borderRadius: 2
          }}
        >
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PointOfSaleIcon sx={{ fontSize: 16 }} />
            Punto Mi Banco
          </Typography>
          <Typography variant="h6" sx={{ color: '#8b5cf6', fontWeight: 'bold' }}>
            {totalsByMethod?.totalPosMiBanco?.toFixed(2) || '0.00'} Bs
          </Typography>
        </Paper>

        {/* Totales por Categoría */}
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            Mikrowisp: ${totalsByCategory?.totalMikrowispUSD?.toFixed(2) || '0.00'}
          </Typography>
          <br />
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            Soporte/Instalación: ${totalsByCategory?.totalSupportInstallationUSD?.toFixed(2) || '0.00'}
          </Typography>
        </Box>

        {/* Botón Cerrar Caja */}
        {isSessionOpen && onCloseSession && (
          <Button 
            variant="contained" 
            color="error" 
            fullWidth 
            onClick={onCloseSession}
            sx={{ mt: 2 }}
          >
            Cerrar Caja
          </Button>
        )}
      </Box>
    </Box>
  );
};
