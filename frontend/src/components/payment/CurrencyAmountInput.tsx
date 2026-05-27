import { TextField } from '@mui/material';

interface CurrencyAmountInputProps {
  value: string | number;
  onChange: (value: string) => void;
  currency: 'USD' | 'VES';
  label?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

/**
 * FASE 4: Componente independiente para input de monto
 * Responsabilidad: Input numérico formateado para el monto cobrado
 * NO contiene lógica de cálculo, solo renderizado y control de entrada
 */
export const CurrencyAmountInput = ({ 
  value, 
  onChange, 
  currency,
  label = 'Monto',
  disabled = false,
  readOnly = false
}: CurrencyAmountInputProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Permitir números, punto decimal y coma
    if (/^[\d.,]*$/.test(inputValue) || inputValue === '') {
      onChange(inputValue);
    }
  };

  return (
    <TextField
      sx={{ flex: 1.5 }}
      type="text"
      label={label}
      size="small"
      value={value || ''}
      onChange={handleChange}
      disabled={disabled}
      InputProps={{
        readOnly: readOnly,
        endAdornment: currency === 'USD' ? '$' : 'Bs'
      }}
      placeholder="0.00"
      required
    />
  );
};
