import { Box, Card, CardContent, Chip, IconButton, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ChangeCircleIcon from '@mui/icons-material/ChangeCircle';
import { PaymentEntry } from './PaymentEntryModal';
import { PaymentMethodIcon } from './PaymentMethodIcon';

/**
 * FASE 5: Componente reutilizable para mostrar una tarjeta de pago
 * Centraliza la UI de visualización de pagos compartida entre
 * InvoicePaymentForm, AbonoForm y ManualEntryForm.
 */

interface PaymentCardProps {
  payment: PaymentEntry;
  methodName?: string;
  onRemove: () => void;
}

export const PaymentCard = ({ payment, methodName, onRemove }: PaymentCardProps) => {
  return (
    <Card 
      elevation={0}  // FASE 1: Sin sombra
      sx={{ 
        backgroundColor: '#0f172a',
        borderRadius: 0.5,  // FASE 1: Reducido de 2 a 0.5
        border: '1px solid rgba(255,255,255,0.1)'
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>  {/* FASE 1: Reducido de 2 a 1.5 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            <PaymentMethodIcon method={payment.method} currency={payment.currency} />
            
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                {methodName || payment.method}
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                {payment.currency === 'USD' ? '$' : 'Bs '}{payment.amount.toFixed(2)}
              </Typography>
            </Box>
            
            {/* Chip de referencia */}
            {payment.reference && (
              <Chip
                icon={<ReceiptIcon />}
                label={`REF: ${payment.reference}`}
                size="small"
                sx={{
                  backgroundColor: 'rgba(96,165,250,0.2)',
                  color: '#60a5fa',
                  border: '1px solid #60a5fa'
                }}
              />
            )}
            
            {/* Chip de vuelto */}
            {payment.changeAmount && payment.changeAmount > 0 && (
              <Chip
                icon={<ChangeCircleIcon />}
                label={`Vuelto: ${payment.currency === 'USD' ? '$' : 'Bs '}${payment.changeAmount.toFixed(2)}`}
                size="small"
                sx={{
                  backgroundColor: 'rgba(74,222,128,0.2)',
                  color: '#4ade80',
                  border: '1px solid #4ade80'
                }}
              />
            )}
          </Box>
          
          {/* Botón eliminar */}
          <IconButton 
            onClick={onRemove}
            size="small"
            sx={{ color: '#ef4444' }}
          >
            <DeleteOutlineIcon />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
};
