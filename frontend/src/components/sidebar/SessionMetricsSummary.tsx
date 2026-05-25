import { Box, Typography, Divider, LinearProgress } from '@mui/material';
import { useAppStore } from '../../store';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

interface SessionMetricsSummaryProps {
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
}

export const SessionMetricsSummary = ({ summary }: SessionMetricsSummaryProps) => {
  const currentSession = useAppStore(state => state.currentSession);
  const isSessionOpen = useAppStore(state => state.isSessionOpen);

  if (!isSessionOpen || !currentSession) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
          No hay sesión activa
        </Typography>
      </Box>
    );
  }

  // Calcular totales generales
  const totalUSD = (summary?.totalsByMethod.totalCashUSD || 0);
  const totalVES = (summary?.totalsByMethod.totalCashVES || 0);
  const totalBanesco = (summary?.totalsByMethod.totalPosBanesco || 0);
  const totalMiBanco = (summary?.totalsByMethod.totalPosMiBanco || 0);
  
  const grandTotal = totalUSD + totalBanesco + totalMiBanco;

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AssessmentIcon fontSize="small" />
        Totales de Sesión
      </Typography>

      {/* Sesión Actual Info */}
      <Box sx={{ 
        backgroundColor: 'rgba(33, 150, 243, 0.1)', 
        borderRadius: 2, 
        p: 2, 
        mb: 2,
        border: '1px solid rgba(33, 150, 243, 0.3)'
      }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}>
          Sesión Actual
        </Typography>
        <Typography variant="h6" sx={{ color: '#2196f3', fontWeight: 'bold' }}>
          #{currentSession.id}
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          Iniciada: {new Date(currentSession.createdAt).toLocaleString('es-VE')}
        </Typography>
      </Box>

      {/* Totales por Método */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', mb: 1.5 }}>
          Recaudación por Método
        </Typography>

        {/* Efectivo USD */}
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="body2" sx={{ color: 'white', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AccountBalanceWalletIcon sx={{ fontSize: 16, color: '#4caf50' }} />
              Efectivo USD
            </Typography>
            <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
              ${totalUSD.toFixed(2)}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={grandTotal > 0 ? (totalUSD / grandTotal) * 100 : 0} 
            sx={{ 
              height: 6, 
              borderRadius: 1,
              backgroundColor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': { backgroundColor: '#4caf50' }
            }} 
          />
        </Box>

        {/* Efectivo VES */}
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="body2" sx={{ color: 'white', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AccountBalanceWalletIcon sx={{ fontSize: 16, color: '#ff9800' }} />
              Efectivo VES
            </Typography>
            <Typography variant="body2" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
              Bs {totalVES.toFixed(2)}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={0} 
            sx={{ 
              height: 6, 
              borderRadius: 1,
              backgroundColor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': { backgroundColor: '#ff9800' }
            }} 
          />
        </Box>

        {/* POS Banesco */}
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="body2" sx={{ color: 'white', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AccountBalanceWalletIcon sx={{ fontSize: 16, color: '#2196f3' }} />
              POS Banesco
            </Typography>
            <Typography variant="body2" sx={{ color: '#2196f3', fontWeight: 'bold' }}>
              Bs {totalBanesco.toFixed(2)}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={grandTotal > 0 ? (totalBanesco / grandTotal) * 100 : 0} 
            sx={{ 
              height: 6, 
              borderRadius: 1,
              backgroundColor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': { backgroundColor: '#2196f3' }
            }} 
          />
        </Box>

        {/* POS Mi Banco */}
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="body2" sx={{ color: 'white', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AccountBalanceWalletIcon sx={{ fontSize: 16, color: '#9c27b0' }} />
              POS Mi Banco
            </Typography>
            <Typography variant="body2" sx={{ color: '#9c27b0', fontWeight: 'bold' }}>
              Bs {totalMiBanco.toFixed(2)}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={grandTotal > 0 ? (totalMiBanco / grandTotal) * 100 : 0} 
            sx={{ 
              height: 6, 
              borderRadius: 1,
              backgroundColor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': { backgroundColor: '#9c27b0' }
            }} 
          />
        </Box>
      </Box>

      {/* Total General */}
      <Box sx={{ 
        backgroundColor: 'rgba(76, 175, 80, 0.15)', 
        borderRadius: 2, 
        p: 2,
        border: '1px solid rgba(76, 175, 80, 0.3)'
      }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}>
          Total Recaudado (USD)
        </Typography>
        <Typography variant="h5" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
          ${grandTotal.toFixed(2)}
        </Typography>
      </Box>

      {/* Totales por Categoría de Servicio */}
      {summary?.totalsByCategory && (
        <>
          <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
          <Box>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', mb: 1 }}>
              Por Tipo de Servicio
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" sx={{ color: 'white', fontSize: '0.8rem' }}>
                🌐 Mikrowisp:
              </Typography>
              <Typography variant="body2" sx={{ color: '#64b5f6', fontWeight: 'bold', fontSize: '0.8rem' }}>
                ${(summary.totalsByCategory.totalMikrowispUSD || 0).toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: 'white', fontSize: '0.8rem' }}>
                🔧 Soporte/Instalación:
              </Typography>
              <Typography variant="body2" sx={{ color: '#ffb74d', fontWeight: 'bold', fontSize: '0.8rem' }}>
                ${(summary.totalsByCategory.totalSupportInstallationUSD || 0).toFixed(2)}
              </Typography>
            </Box>
          </Box>
        </>
      )}

      <Divider sx={{ mt: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
    </Box>
  );
};
