import { TextField } from '@mui/material';
import { useState, useEffect } from 'react';

interface CurrencyAmountInputProps {
  value: string | number;
  onChange: (value: string) => void;
  label?: string;
  currency?: 'USD' | 'VES';
  disabled?: boolean;
  required?: boolean;
  bcvRate?: number;
}

/**
 * FASE 4: Componente modular para entrada de monto con formato de moneda
 * Responsabilidad: Input numérico formateado para el monto cobrado
 * Estado: Controla el debouncing del texto ingresado para evitar recalcular 
 * con cada pulsación de tecla y evitar bloqueos en entornos Linux antiguos
 */
export const CurrencyAmountInput = ({ 
  value, 
  onChange, 
  label = 'Monto',
  currency = 'USD',
  disabled = false,
  required = false,
  bcvRate
}: CurrencyAmountInputProps) => {
  const [localValue, setLocalValue] = useState<string>(String(value || ''));

  // Sincronizar con el valor externo cuando cambia (ej: al cambiar método de pago)
  useEffect(() => {
    setLocalValue(String(value || ''));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    // Propagate immediately without debounce for better UX
    onChange(newValue);
  };

  const displayLabel = currency === 'VES' && bcvRate 
    ? `${label} (VES - Tasa: ${bcvRate.toFixed(2)})`
    : `${label} (${currency})`;

  return (
    <TextField 
      sx={{ flex: 1 }} 
      type="number" 
      inputProps={{ step: "0.01", min: "0" }} 
      label={displayLabel}
      size="small" 
      value={localValue} 
      onChange={handleChange}
      disabled={disabled}
      required={required}
      placeholder={currency === 'USD' ? '0.00' : '0.00'}
    />
  );
};
