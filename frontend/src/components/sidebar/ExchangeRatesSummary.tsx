import { Box, Typography, Divider, Chip } from '@mui/material';
import { useAppStore } from '../../store';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

export const ExchangeRatesSummary = () => {
  const bcvRate = useAppStore(state => state.bcvRate);
  const globalSettings = useAppStore(state => state.globalSettings);

  // FASE 5: Obtener configuración dinámica de IVA
  const IVA_RATE = globalSettings?.iva_rate ?? 0.16;
  const IVA_THRESHOLD = globalSettings?.iva_threshold ?? 0.5;

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <TrendingUpIcon fontSize="small" />
        Tasas de Cambio
      </Typography>

      {/* Tasa BCV */}
      <Box sx={{ 
        backgroundColor: 'rgba(255,255,255,0.05)', 
        borderRadius: 2, 
        p: 2, 
        mb: 2,
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <AttachMoneyIcon sx={{ color: '#4caf50', fontSize: 20 }} />
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            Tasa BCV Oficial
          </Typography>
        </Box>
        <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
          {bcvRate ? `Bs ${Number(bcvRate).toFixed(2)}` : 'Cargando...'}
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
          Por cada 1 USD
        </Typography>
      </Box>

      {/* Configuración de IVA */}
      <Box sx={{ 
        backgroundColor: 'rgba(255, 152, 0, 0.1)', 
        borderRadius: 2, 
        p: 2,
        border: '1px solid rgba(255, 152, 0, 0.3)'
      }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', mb: 1 }}>
          Reglas de Negocio
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: 'white', fontSize: '0.85rem' }}>
              IVA Aplicable:
            </Typography>
            <Chip 
              label={`${(IVA_RATE * 100).toFixed(0)}%`} 
              size="small" 
              sx={{ 
                bgcolor: 'rgba(255, 152, 0, 0.3)', 
                color: 'white',
                fontWeight: 'bold'
              }} 
            />
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: 'white', fontSize: '0.85rem' }}>
              Umbral IVA:
            </Typography>
            <Chip 
              label={`< ${(IVA_THRESHOLD * 100).toFixed(0)}% USD`} 
              size="small" 
              sx={{ 
                bgcolor: 'rgba(255, 152, 0, 0.3)', 
                color: 'white',
                fontWeight: 'bold'
              }} 
            />
          </Box>
        </Box>
        
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mt: 1, fontSize: '0.7rem' }}>
          IVA se aplica cuando USD pagado es menor al {(IVA_THRESHOLD * 100).toFixed(0)}% del total
        </Typography>
      </Box>

      <Divider sx={{ mt: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
    </Box>
  );
};
