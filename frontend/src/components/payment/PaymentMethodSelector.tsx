import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

interface PaymentMethodSelectorProps {
  value: string;
  onChange: (methodCode: string) => void;
  methods: Array<{
    id: number;
    code: string;
    name: string;
    currency: 'USD' | 'VES';
    is_active?: boolean;
  }>;
  disabled?: boolean;
}

/**
 * FASE 4: Componente independiente para seleccionar método de pago
 * Responsabilidad: Renderizar exclusivamente el dropdown de métodos disponibles
 * NO contiene lógica matemática, solo renderizado y eventos
 */
export const PaymentMethodSelector = ({ 
  value, 
  onChange, 
  methods, 
  disabled = false 
}: PaymentMethodSelectorProps) => {
  return (
    <FormControl sx={{ flex: 1, minWidth: 200 }} size="small">
      <InputLabel>Método de Pago</InputLabel>
      <Select
        value={value || ''}
        label="Método de Pago"
        onChange={(e) => onChange(e.target.value as string)}
        disabled={disabled}
        required
      >
        {methods
          .filter((m) => m.is_active !== false)
          .map((method) => (
            <MenuItem key={method.id} value={method.code}>
              {method.name} ({method.currency})
            </MenuItem>
          ))}
      </Select>
    </FormControl>
  );
};
