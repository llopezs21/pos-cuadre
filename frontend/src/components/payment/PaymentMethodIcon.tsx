import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PaidIcon from '@mui/icons-material/Paid';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

/**
 * FASE 5: Helper component para iconos de métodos de pago
 * Centraliza la lógica de selección de iconos compartida entre
 * InvoicePaymentForm, AbonoForm y ManualEntryForm.
 */

interface PaymentMethodIconProps {
  method: string;
  currency: string;
}

export const PaymentMethodIcon = ({ method, currency }: PaymentMethodIconProps) => {
  const methodUpper = method.toUpperCase();
  
  if (methodUpper.includes('CASH')) {
    return currency === 'USD' ? (
      <AttachMoneyIcon sx={{ color: '#4ade80' }} />
    ) : (
      <PaidIcon sx={{ color: '#fb923c' }} />
    );
  }
  
  return <AccountBalanceIcon sx={{ color: '#60a5fa' }} />;
};
