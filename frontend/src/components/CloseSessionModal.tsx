import { useState } from 'react';
import { useAppStore } from '../store';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Box, Paper, Stack } from '@mui/material';
import type { ClosingData } from '../services/api';

// --- NUEVO COMPONENTE PARA CONTEO DE BILLETES USD ---
const USDCountInput = ({ value, onChange }: { value: number, onChange: (val: number) => void }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    try {
      // Evalúa la expresión de billetes (ej: 2*50+3*20)
      // Solo permite números, +, *, espacios
      if (/^[\d+* \t.]+$/.test(val)) {
        // eslint-disable-next-line no-eval
        const total = eval(val.replace(/[^-()\d/*+.]/g, ''));
        if (typeof total === 'number' && !isNaN(total)) {
          setError(null);
          onChange(Number(total));
        } else {
          setError('Expresión inválida');
          onChange(0);
        }
      } else if (val === '') {
        setError(null);
        onChange(0);
      } else {
        setError('Solo números, + y *');
        onChange(0);
      }
    } catch {
      setError('Expresión inválida');
      onChange(0);
    }
  };

  return (
    <Box>
      <TextField
        label="Conteo de Billetes USD (ej: 2*50+3*20)"
        value={input}
        onChange={handleInput}
        fullWidth
        error={!!error}
        helperText={error || `Total: $${value.toFixed(2)}`}
        sx={{ mb: 1 }}
      />
    </Box>
  );
};

// --- NUEVO COMPONENTE PARA CONTEO DE BILLETES VES ---
const VESCountInput = ({ value, onChange }: { value: number, onChange: (val: number) => void }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    try {
      if (/^[\d+* \t.]+$/.test(val)) {
        // eslint-disable-next-line no-eval
        const total = eval(val.replace(/[^-()\d/*+.]/g, ''));
        if (typeof total === 'number' && !isNaN(total)) {
          setError(null);
          onChange(Number(total));
        } else {
          setError('Expresión inválida');
          onChange(0);
        }
      } else if (val === '') {
        setError(null);
        onChange(0);
      } else {
        setError('Solo números, + y *');
        onChange(0);
      }
    } catch {
      setError('Expresión inválida');
      onChange(0);
    }
  };

  return (
    <Box>
      <TextField
        label="Conteo de Billetes VES (ej: 5*10000+2*5000)"
        value={input}
        onChange={handleInput}
        fullWidth
        error={!!error}
        helperText={error || `Total: ${value.toFixed(2)} VES`}
        sx={{ mb: 1 }}
      />
    </Box>
  );
};

interface Props {
  open: boolean;
  onClose: () => void;
  summary: any;
}

export const CloseSessionModal: React.FC<Props> = ({ open, onClose, summary }) => {
  const { closeSession, user } = useAppStore();
  const [formData, setFormData] = useState<ClosingData>({
    cash_usd: 0, cash_ves: 0,
    banesco_lote: '', banesco_total: 0,
    mibanco_lote: '', mibanco_total: 0,
    mikrowisp: 0,
  });

  // Actualiza el campo correspondiente
  const setField = (field: keyof ClosingData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setField(e.target.name as keyof ClosingData, e.target.value);
  };

  const handleSubmit = async () => {
    try {
      // Convierte los valores a números antes de enviar
      const numericData = { ...formData, ...Object.fromEntries(Object.entries(formData).map(([key, value]) => [key, key.includes('lote') ? value : Number(value)])) };
      await closeSession(numericData as ClosingData);
      onClose(); // Cierra el modal solo si tiene éxito
    } catch (error) {
      console.error("No se pudo cerrar la caja");
    }
  };

  const systemTotals = summary?.totalsByMethod || {};
  const systemCategories = summary?.totalsByCategory || {}; // <-- nuevo
  const discrepancy = (formData.cash_usd + (formData.banesco_total + formData.mibanco_total) / 36.5) - (systemTotals.totalCashUSD + (systemTotals.totalPosBanesco + systemTotals.totalPosMiBanco) / 36.5);


  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Formulario de Cierre de Caja</DialogTitle>
      <DialogContent>
        <Typography variant="h6" gutterBottom sx={{ mt: 1 }}>
          Montos Físicos (Conteo Manual)
        </Typography>
        <Paper sx={{ p: 2, mb: 2, background: 'rgba(0,0,0,0.03)' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Box sx={{ flex: 1 }}>
              <USDCountInput value={formData.cash_usd} onChange={val => setField('cash_usd', val)} />
              <Typography variant="body2" sx={{ mt: 1 }}>Sistema Espera: ${systemTotals.totalCashUSD?.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <VESCountInput value={formData.cash_ves} onChange={val => setField('cash_ves', val)} />
              <Typography variant="body2" sx={{ mt: 1 }}>Sistema Espera: {systemTotals.totalCashVES?.toFixed(2)} VES</Typography>
            </Box>
          </Stack>
        </Paper>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            flexWrap: 'wrap',
            gap: 2,
            mb: 2
          }}
        >
          <Box sx={{ width: { xs: '100%', md: '50%' } }}>
            <TextField name="banesco_lote" label="Lote Punto Banesco" onChange={handleChange} fullWidth />
            <TextField name="banesco_total" label="Total Punto Banesco" type="number" onChange={handleChange} fullWidth sx={{ mt: 1 }} />
            {/* Mostrar monto esperado por el sistema (Banesco) */}
            <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
              Sistema espera (Banesco): {systemTotals.totalPosBanesco ? `${systemTotals.totalPosBanesco.toFixed(2)} VES` : '0.00 VES'}
            </Typography>
          </Box>
          <Box sx={{ width: { xs: '100%', md: '50%' } }}>
            <TextField name="mibanco_lote" label="Lote Punto Mi Banco" onChange={handleChange} fullWidth />
            <TextField name="mibanco_total" label="Total Punto Mi Banco" type="number" onChange={handleChange} fullWidth sx={{ mt: 1 }} />
            {/* Mostrar monto esperado por el sistema (Mi Banco) */}
            <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
              Sistema espera (Mi Banco): {systemTotals.totalPosMiBanco ? `${systemTotals.totalPosMiBanco.toFixed(2)} VES` : '0.00 VES'}
            </Typography>
          </Box>
          <Box sx={{ width: '100%' }}>
            <TextField name="mikrowisp" label="Monto Total Mikrowisp" type="number" onChange={handleChange} fullWidth sx={{ mt: 2 }} />
            {/* Mostrar monto esperado por el sistema (Mikrowisp) */}
            <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
              Sistema espera (Mikrowisp): ${systemCategories.totalMikrowispUSD ? systemCategories.totalMikrowispUSD.toFixed(2) : '0.00'}
            </Typography>
          </Box>
        </Box>
        {Math.abs(discrepancy) > 0.05 && user?.role !== 'admin' && (
          <Typography color="error" sx={{ mt: 2 }}>La caja no cuadra. Solo un administrador puede cerrar.</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained">
          Cerrar Caja
        </Button>
      </DialogActions>
    </Dialog>
  );
};