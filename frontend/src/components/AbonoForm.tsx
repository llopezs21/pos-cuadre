import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { searchClients } from '../services/api';
import { 
  Autocomplete, 
  Box, 
  Button, 
  CircularProgress, 
  Stack, 
  TextField, 
  Typography,
  Paper
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { PaymentEntryModal, PaymentEntry } from './payment/PaymentEntryModal';
import { PaymentCard } from './payment/PaymentCard';
import { usePaymentCalculations } from '../hooks/usePaymentCalculations';

export const AbonoForm = () => {
  const { createAbono, paymentMethods, fetchPaymentMethods, bcvRate } = useAppStore();  // PARCHE: bcvRate agregado
  
  // Estados para el buscador de cliente
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Estados para el formulario de abono
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  
  // FASE 4: Agregar input de "Monto Base" igual que ManualEntryForm
  const [baseAmountUSD, setBaseAmountUSD] = useState('');
  const [notes, setNotes] = useState('');
  
  // FASE 4: Cambiar de payment (singular) a payments (plural array)
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  // FASE 4: Calcular totalToPay desde el input de Monto Base
  const totalToPay = Number(baseAmountUSD) || 0;

  // FASE 5: Usar hook custom para cálculos
  const {
    totalPaidUSD,
    usdPaymentTotal,
    applyIVA,
    totalToPayWithIVA,
    remainingAmountInUSD,
    IVA_RATE
  } = usePaymentCalculations({
    payments,
    totalToPay
  });
  useEffect(() => {
    if (inputValue === '' || !open) {
      setOptions([]);
      return;
    }
    setLoadingSearch(true);
    const timer = setTimeout(async () => {
      try {
        const response = await searchClients(inputValue);
        setOptions(response.data);
      } finally {
        setLoadingSearch(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [inputValue, open]);

  // Cargar métodos de pago
  useEffect(() => {
    if (!paymentMethods || paymentMethods.length === 0) {
      fetchPaymentMethods().catch(() => {});
    }
  }, [paymentMethods, fetchPaymentMethods]);

  // FASE 4: Handler para agregar pago (ahora soporta múltiples)
  const handlePaymentConfirm = (newPayment: PaymentEntry) => {
    setPayments(prev => [...prev, newPayment]);
    setPaymentModalOpen(false);
  };

  // FASE 4: Handler para eliminar un pago específico
  const handleRemovePayment = (index: number) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setSelectedClient(null);
    setInputValue('');
    setBaseAmountUSD('');
    setNotes('');
    setPayments([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payments.length === 0) return;
    
    setLoadingSubmit(true);

    // FASE 4: Enviar múltiples pagos al backend
    const finalPayments = payments.map(p => ({
      method: p.method,
      amount: p.amount,
      bcvRate: p.bcvRate,
      reference: p.reference
    }));

    const payload = {
      client_mks_id: selectedClient.mks_id,
      amount: Number(totalToPayWithIVA.toFixed(6)), // Monto total con IVA si aplica
      currency: 'USD', // Base siempre en USD
      bcv_rate: Number(bcvRate) || 36.5,
      notes,
      payments: finalPayments // Array de pagos
    };

    try {
      await createAbono(payload as any);
      resetForm();
      window.dispatchEvent(new CustomEvent('transactionAdded'));
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {/* Título */}
      <Paper 
        sx={{ 
          p: 2, 
          mb: 3, 
          backgroundColor: '#1e293b',
          borderRadius: 1,
          border: '2px solid #4ade80'
        }}
      >
        <Typography variant="h5" sx={{ color: '#4ade80', fontWeight: 700 }}>
          💰 Registrar un Pago Parcial (Abono)
        </Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8', mt: 1 }}>
          Los abonos son pagos parciales que se pueden aplicar más tarde a facturas
        </Typography>
      </Paper>

      {/* Búsqueda de Cliente */}
      <Paper 
        sx={{ 
          p: 2, 
          mb: 3, 
          backgroundColor: '#1e293b',
          borderRadius: 1,
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, color: '#cbd5e1' }}>
          1. Buscar Cliente
        </Typography>
        <Autocomplete
          open={open}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
          options={options}
          loading={loadingSearch}
          filterOptions={(x) => x}
          getOptionLabel={(option) => `${option.name} - ${option.id_number}` || ""}
          isOptionEqualToValue={(option, value) => option.mks_id === value.mks_id}
          onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
          onChange={(_, newValue) => setSelectedClient(newValue)}
          value={selectedClient}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Nombre o cédula..."
              required
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingSearch ? <CircularProgress size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
              sx={{
                '& .MuiInputBase-root': {
                  backgroundColor: '#0f172a',
                  color: '#fff'
                }
              }}
            />
          )}
        />
      </Paper>

      {/* FASE 4: Input de Monto Base (igual que ManualEntryForm) */}
      <Paper 
        sx={{ 
          p: 2, 
          mb: 3, 
          backgroundColor: '#1e293b',
          borderRadius: 1,
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, color: '#cbd5e1' }}>
          2. Monto Base del Abono
        </Typography>
        <TextField 
          label="Monto Base USD" 
          type="number" 
          inputProps={{ step: "0.01" }} 
          value={baseAmountUSD} 
          onChange={(e) => setBaseAmountUSD(e.target.value)} 
          required
          placeholder="Ej: 50.00"
          fullWidth
          sx={{
            '& .MuiInputBase-root': {
              backgroundColor: '#0f172a',
              color: '#fff'
            }
          }}
        />
        <Typography variant="caption" sx={{ color: '#94a3b8', mt: 1, display: 'block' }}>
          Ingrese el monto base del abono en dólares (USD)
        </Typography>
      </Paper>

      {/* FASE 4: Resumen de Montos (igual que ManualEntryForm) */}
      {totalToPay > 0 && (
        <Paper 
          sx={{ 
            p: 2, 
            mb: 3, 
            backgroundColor: '#0f172a',
            borderRadius: 1,
            border: '2px solid #4ade80'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
              Monto Base:
            </Typography>
            <Typography variant="h5" sx={{ color: '#4ade80', fontWeight: 700 }}>
              ${totalToPay.toFixed(2)}
            </Typography>
          </Box>

          {/* FASE 4: Badge de IVA (igual que InvoicePaymentForm) */}
          {applyIVA && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: '#fb923c', borderRadius: 0.5 }}>
              <Typography sx={{ color: '#000', fontWeight: 600, fontSize: '0.9rem' }}>
                ⚠️ Se aplica IVA ({(IVA_RATE * 100).toFixed(0)}%) a la porción en VES
              </Typography>
              <Typography sx={{ color: '#000', fontSize: '0.85rem', mt: 0.5 }}>
                Total con IVA: ${totalToPayWithIVA.toFixed(2)}
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* FASE 4: Lista de Pagos Agregados (ahora múltiples) */}
      {payments.length > 0 && (
        <Paper 
          sx={{ 
            p: 2, 
            mb: 3, 
            backgroundColor: '#1e293b',
            borderRadius: 1,
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, color: '#cbd5e1' }}>
            3. Pagos Agregados
          </Typography>
          <Stack spacing={2}>
            {/* FASE 4: Keys únicas para evitar warnings de React */}
            {payments.map((payment, index) => (
              <PaymentCard
                key={`abono-payment-${payment.method}-${index}-${payment.amount}`}
                payment={payment}
                methodName={paymentMethods?.find(m => m.code === payment.method)?.name}
                onRemove={() => handleRemovePayment(index)}
              />
            ))}
          </Stack>
        </Paper>
      )}

      {/* Botón Agregar Pago */}
      {totalToPay > 0 && (
        <Button
          fullWidth
          variant="outlined"
          size="large"
          startIcon={<AddCircleOutlineIcon />}
          onClick={() => setPaymentModalOpen(true)}
          sx={{
            mb: 3,
            borderColor: '#4ade80',
            color: '#4ade80',
            backgroundColor: 'rgba(74,222,128,0.1)',
            borderWidth: 2,
            borderStyle: 'dashed',
            py: 2,
            '&:hover': {
              borderColor: '#22c55e',
              backgroundColor: 'rgba(74,222,128,0.2)',
              borderWidth: 2
            }
          }}
        >
          Agregar Pago
        </Button>
      )}

      {/* FASE 4: Resumen Final (igual que ManualEntryForm) */}
      {payments.length > 0 && (
        <Paper 
          sx={{ 
            p: 2, 
            mb: 3, 
            backgroundColor: remainingAmountInUSD <= 0.01 ? '#0f172a' : '#1e293b',
            borderRadius: 1,
            border: `2px solid ${remainingAmountInUSD <= 0.01 ? '#4ade80' : '#fb923c'}`
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ color: '#cbd5e1' }}>
              Total Pagado:
            </Typography>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
              ${totalPaidUSD.toFixed(2)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ 
              color: remainingAmountInUSD <= 0.01 ? '#4ade80' : '#fb923c',
              fontWeight: 700
            }}>
              {remainingAmountInUSD <= 0.01 ? 'Cuadre Exacto ✓' : 'Restante:'}
            </Typography>
            <Typography variant="h5" sx={{ 
              color: remainingAmountInUSD <= 0.01 ? '#4ade80' : '#fb923c',
              fontWeight: 700
            }}>
              ${Math.abs(remainingAmountInUSD).toFixed(2)}
              {remainingAmountInUSD < 0 && ' (Sobra)'}
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Notas Opcionales */}
      {payments.length > 0 && (
        <Paper 
          sx={{ 
            p: 2, 
            mb: 3, 
            backgroundColor: '#1e293b',
            borderRadius: 1,
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, color: '#cbd5e1' }}>
            4. Notas (Opcional)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Ej: Abono para factura #1234..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{
              '& .MuiInputBase-root': {
                backgroundColor: '#0f172a',
                color: '#fff'
              }
            }}
          />
        </Paper>
      )}

      {/* Botón Guardar */}
      {payments.length > 0 && (
        <Button 
          type="submit" 
          variant="contained" 
          fullWidth 
          size="large"
          disabled={loadingSubmit || !selectedClient || Math.abs(remainingAmountInUSD) > 0.01}
          sx={{
            py: 2,
            backgroundColor: '#4ade80',
            color: '#000',
            fontWeight: 700,
            fontSize: '1.1rem',
            '&:hover': {
              backgroundColor: '#22c55e'
            },
            '&:disabled': {
              backgroundColor: '#334155',
              color: '#64748b'
            }
          }}
        >
          {loadingSubmit ? <CircularProgress size={24} sx={{ color: '#64748b' }} /> : 'Guardar Abono'}
        </Button>
      )}

      {/* Payment Entry Modal */}
      <PaymentEntryModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onConfirm={handlePaymentConfirm}
        remainingAmount={remainingAmountInUSD}
        baseCurrency="USD"
        availableMethods={paymentMethods || []}
        totalBase={totalToPay}                   // FASE 4: Monto base sin IVA
        includesIVA={applyIVA}                   // FASE 4: Indica si remainingAmount incluye IVA
      />
    </Box>
  );
};
