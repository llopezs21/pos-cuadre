import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

interface PaymentMethod {
  id: number;
  name: string;
  code: string;
  currency: 'USD' | 'VES';
  is_active?: boolean;
}

interface PaymentMethodSelectorProps {
  value: string;
  paymentMethods: PaymentMethod[];
  onChange: (methodCode: string) => void;
  label?: string;
  disabled?: boolean;
}

/**
 * FASE 4: Componente modular para selección de método de pago
 * Responsabilidad: Renderizar exclusivamente el dropdown de métodos disponibles
 * Estado: Recibe el método seleccionado y dispara la inicialización síncrona de tasa
 */
export const PaymentMethodSelector = ({ 
  value, 
  paymentMethods, 
  onChange, 
  label = 'Método de Pago',
  disabled = false 
}: PaymentMethodSelectorProps) => {
  return (
    <FormControl size="small" sx={{ flex: 1, minWidth: 150 }} disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select 
        value={value} 
        label={label} 
        onChange={(e) => onChange(e.target.value as string)}
      >
        {paymentMethods.map((method) => (
          <MenuItem key={method.code} value={method.code}>
            {method.name} ({method.currency})
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
