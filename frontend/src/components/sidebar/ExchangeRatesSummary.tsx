import { Box, Typography, Chip } from '@mui/material';
import { useAppStore } from '../../store';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

export const ExchangeRatesSummary = () => {
  const bcvRate = useAppStore(state => state.bcvRate);

  return (
    <Box>
      <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>
        Tasas de Cambio
      </Typography>
      
      <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            BCV
          </Typography>
          <Chip 
            icon={<TrendingUpIcon sx={{ color: '#10b981 !important' }} />}
            label={`${bcvRate?.toFixed(2) || '36.50'} Bs/$`}
            size="small"
            sx={{ 
              bgcolor: 'rgba(16, 185, 129, 0.1)', 
              color: '#10b981',
              fontWeight: 'bold'
            }}
          />
        </Box>
      </Box>
    </Box>
  );
};
