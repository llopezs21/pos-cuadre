import { Box, Typography, Chip } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface VATCalculationsBadgeProps {
  applyIVA: boolean;
  ivaRate: number;
  totalBase: number;
  totalWithIVA: number;
  usdPaid: number;
  totalPaidUSD: number;
  remainingUSD: number;
}

/**
 * FASE 4: Componente puramente visual para mostrar cálculos de IVA
 * Responsabilidad: Cuadro informativo condicional sobre la aplicación del IVA
 * Estado: Componente "Dumb" que solo recibe props calculadas y renderiza
 */
export const VATCalculationsBadge = ({
  applyIVA,
  ivaRate,
  totalBase,
  totalWithIVA,
  usdPaid,
  totalPaidUSD,
  remainingUSD
}: VATCalculationsBadgeProps) => {
  return (
    <Box sx={{ mt: 2, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Total Base: ${totalBase.toFixed(2)}
      </Typography>

      {applyIVA ? (
        <Chip
          icon={<WarningAmberIcon />}
          label={`Se aplica IVA (${(ivaRate * 100).toFixed(0)}%)`}
          color="warning"
          size="small"
          sx={{ mb: 1 }}
        />
      ) : (
        <Chip
          icon={<CheckCircleIcon />}
          label="Sin IVA - Umbral alcanzado"
          color="success"
          size="small"
          sx={{ mb: 1 }}
        />
      )}

      <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
        Total a Pagar (calculado): ${totalWithIVA.toFixed(2)}
      </Typography>

      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2">
          Pagado en USD: ${usdPaid.toFixed(2)}
        </Typography>
        <Typography variant="body2">
          Total Ingresado (Equivalente USD): ${totalPaidUSD.toFixed(2)}
        </Typography>
        <Typography 
          variant="body1"
          sx={{ 
            mt: 1,
            fontWeight: 'bold',
            color: Math.abs(remainingUSD) > 0.01 ? 'error.main' : 'success.main' 
          }}
        >
          {remainingUSD < -0.01 
            ? `Sobra: $${Math.abs(remainingUSD).toFixed(2)}` 
            : remainingUSD > 0.01 
            ? `Falta: $${remainingUSD.toFixed(2)}` 
            : 'Cuadre Exacto ✓'}
        </Typography>
      </Box>
    </Box>
  );
};
