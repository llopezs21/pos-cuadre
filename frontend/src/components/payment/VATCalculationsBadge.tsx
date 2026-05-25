import { Box, Typography, Divider, Chip, Alert } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';

interface VATCalculationsBadgeProps {
  applyIVA: boolean;
  ivaRate: number;
  ivaThreshold: number;
  totalBase: number;
  totalWithIVA: number;
  usdPaid: number;
  totalPaidInUSD: number;
  remainingAmount: number;
}

/**
 * FASE 4: Componente modular para mostrar información de IVA
 * Responsabilidad: Cuadro informativo condicional que muestra si aplica 
 * la regla del IVA según el porcentaje de divisas recibido
 * Estado: Componente puramente visual (Dumb Component) que recibe props calculadas
 */
export const VATCalculationsBadge = ({
  applyIVA,
  ivaRate,
  ivaThreshold,
  totalBase,
  totalWithIVA,
  usdPaid,
  totalPaidInUSD,
  remainingAmount
}: VATCalculationsBadgeProps) => {
  const usdPercentage = totalBase > 0 ? (usdPaid / totalBase) * 100 : 0;

  return (
    <Box sx={{ mt: 2, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
      {/* Información de IVA */}
      {applyIVA && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight="bold">
            ⚠️ IVA Aplicable: {(ivaRate * 100).toFixed(0)}%
          </Typography>
          <Typography variant="caption">
            Se aplica IVA porque el pago en USD ({usdPercentage.toFixed(1)}%) es menor al {(ivaThreshold * 100).toFixed(0)}% del total
          </Typography>
        </Alert>
      )}

      {!applyIVA && totalBase > 0 && (
        <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight="bold">
            ℹ️ Sin IVA
          </Typography>
          <Typography variant="caption">
            El pago en USD ({usdPercentage.toFixed(1)}%) supera el umbral del {(ivaThreshold * 100).toFixed(0)}%
          </Typography>
        </Alert>
      )}

      {/* Desglose de montos */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Total Base:
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            ${totalBase.toFixed(2)}
          </Typography>
        </Box>

        {applyIVA && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="warning.main">
              + IVA ({(ivaRate * 100).toFixed(0)}%):
            </Typography>
            <Typography variant="body2" color="warning.main" fontWeight="medium">
              ${(totalWithIVA - totalBase).toFixed(2)}
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 0.5 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body1" fontWeight="bold">
            Total a Pagar:
          </Typography>
          <Chip 
            label={`$${totalWithIVA.toFixed(2)}`} 
            color="primary" 
            sx={{ fontWeight: 'bold' }}
          />
        </Box>

        <Divider sx={{ my: 0.5 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Pagado en USD:
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            ${usdPaid.toFixed(2)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Total Ingresado (Equiv. USD):
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            ${totalPaidInUSD.toFixed(2)}
          </Typography>
        </Box>

        <Divider sx={{ my: 0.5 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography 
            variant="body1" 
            fontWeight="bold"
            color={Math.abs(remainingAmount) > 0.01 ? 'error' : 'success'}
          >
            Monto Restante:
          </Typography>
          <Chip 
            label={`$${remainingAmount.toFixed(2)}`} 
            color={Math.abs(remainingAmount) > 0.01 ? 'error' : 'success'}
            sx={{ fontWeight: 'bold' }}
          />
        </Box>

        {Math.abs(remainingAmount) < 0.01 && (
          <Alert severity="success" sx={{ mt: 1 }}>
            ✅ El pago está completo y cuadrado
          </Alert>
        )}
      </Box>
    </Box>
  );
};
