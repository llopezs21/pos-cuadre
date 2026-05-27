import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store';
import { searchClients, getUnpaidInvoices, getAvailableAbonos } from '../services/api';
import { 
  Autocomplete, 
  Box, 
  Button, 
  Checkbox, 
  CircularProgress, 
  FormControlLabel, 
  Paper, 
  Stack, 
  TextField, 
  Typography,
  Divider
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import toast from 'react-hot-toast';
import { PaymentEntryModal, PaymentEntry } from './payment/PaymentEntryModal';
import { PaymentCard } from './payment/PaymentCard';
import { usePaymentCalculations } from '../hooks/usePaymentCalculations';

export const InvoicePaymentForm = () => {
  const { addTransaction, paymentMethods, fetchPaymentMethods } = useAppStore();

  // Estados para búsqueda de cliente
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Estados para facturas y abonos
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<any[]>([]);
  const [availableAbonos, setAvailableAbonos] = useState<any[]>([]);
  const [selectedAbonos, setSelectedAbonos] = useState<any[]>([]);
  
  // FASE 3: Nuevo estado para pagos usando PaymentEntry[]
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  
  // Estado del modal de pago
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  // Cargar facturas y abonos cuando se selecciona un cliente
  useEffect(() => {
    setUnpaidInvoices([]);
    setSelectedInvoices([]);
    setAvailableAbonos([]);
    setSelectedAbonos([]);

    if (selectedClient) {
      getUnpaidInvoices(selectedClient.mks_id)
        .then(res => setUnpaidInvoices(res.data || []))
        .catch(err => {
          if (err?.response?.data?.message) {
            toast.error(err.response.data.message);
          } else {
            toast.error('Error al buscar facturas.');
          }
          setUnpaidInvoices([]);
        });

      getAvailableAbonos(selectedClient.mks_id)
        .then(res => setAvailableAbonos(res.data || []))
        .catch(err => {
          console.error('Error al buscar abonos:', err);
          setAvailableAbonos([]);
        });
    }
  }, [selectedClient]);

  // Búsqueda de clientes con debounce
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

  // Cargar métodos de pago si no existen
  useEffect(() => {
    if (!paymentMethods || paymentMethods.length === 0) {
      fetchPaymentMethods().catch(() => {});
    }
  }, [paymentMethods, fetchPaymentMethods]);

  // Handlers
  const handleInvoiceSelection = (invoice: any, isChecked: boolean) => {
    setSelectedInvoices(prev => 
      isChecked ? [...prev, invoice] : prev.filter(inv => inv.id !== invoice.id)
    );
  };

  const handleAbonoSelection = (abono: any, isChecked: boolean) => {
    setSelectedAbonos(prev => 
      isChecked ? [...prev, abono] : prev.filter(abn => abn.id !== abono.id)
    );
  };

  // FASE 3: Handler para confirmar pago desde el modal
  const handlePaymentConfirm = (payment: PaymentEntry) => {
    setPayments(prev => [...prev, payment]);
    setPaymentModalOpen(false);
  };

  // FASE 3: Handler para eliminar un pago
  const handleRemovePayment = (index: number) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
  };

  // Cálculos
  const totalToPay = useMemo(
    () => selectedInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0),
    [selectedInvoices]
  );

  const totalAbonoCredit = useMemo(
    () => selectedAbonos.reduce((sum, abn) => sum + Number(abn.amount), 0),
    [selectedAbonos]
  );

  const totalToPayInNewMoney = totalToPay - totalAbonoCredit;

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
    totalToPay: totalToPayInNewMoney
  });

  // Reset form
  const resetForm = () => {
    setSelectedClient(null);
    setInputValue('');
    setAvailableAbonos([]);
    setSelectedAbonos([]);
    setPayments([]);
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingSubmit(true);
    
    // FASE 3: Convertir PaymentEntry[] a formato del backend
    const finalPayments = payments.map(p => ({
      method: p.method,
      amount: p.amount,
      bcvRate: p.bcvRate,
      reference: p.reference
    }));
    
    const payload = {
      invoiceIds: selectedInvoices.map(inv => inv.id),
      payments: finalPayments,
      appliedAbonoIds: selectedAbonos.map(abn => abn.id)
    };
    
    try {
      await addTransaction(payload as any);
      resetForm();
      // Disparar evento para actualizar Dashboard
      window.dispatchEvent(new CustomEvent('transactionAdded'));
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {/* Búsqueda de Cliente */}
      <Paper 
        sx={{ 
          p: 2,  // FASE 1: Reducido de 3 a 2
          mb: 3, 
          backgroundColor: '#1e293b',
          borderRadius: 1,  // FASE 1: Reducido de 3 a 1
          border: '1px solid rgba(255,255,255,0.1)'
        }}
        elevation={0}  // FASE 1: Sin sombra
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

      {/* Sección de Facturas */}
      {unpaidInvoices.length > 0 && (
        <Paper 
          elevation={0}  // FASE 1
          sx={{ 
            p: 2,  // FASE 1: Reducido de 3 a 2
            mb: 3, 
            backgroundColor: '#1e293b',
            borderRadius: 1,  // FASE 1: Reducido de 3 a 1
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, color: '#cbd5e1' }}>
            2. Seleccionar Facturas Pendientes
          </Typography>
          <Stack spacing={1}>
            {unpaidInvoices.map(inv => (
              <FormControlLabel
                key={inv.id}
                control={
                  <Checkbox 
                    onChange={(e) => handleInvoiceSelection(inv, e.target.checked)}
                    sx={{ color: '#60a5fa' }}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <Typography sx={{ color: '#fff' }}>
                      Factura #{inv.mks_invoice_number}
                    </Typography>
                    <Typography sx={{ color: '#4ade80', fontWeight: 600 }}>
                      ${Number(inv.amount).toFixed(2)}
                    </Typography>
                  </Box>
                }
                sx={{ 
                  m: 0,
                  p: 1,  // FASE 1: Reducido de 1.5 a 1
                  backgroundColor: '#0f172a',
                  borderRadius: 0.5,  // FASE 1: Reducido de 2 a 0.5
                  '&:hover': {
                    backgroundColor: '#1a2332'
                  }
                }}
              />
            ))}
          </Stack>
        </Paper>
      )}

      {/* Sección de Abonos */}
      {availableAbonos.length > 0 && (
        <Paper 
          elevation={0}  // FASE 1
          sx={{ 
            p: 2,  // FASE 1: Reducido de 3 a 2
            mb: 3, 
            backgroundColor: '#1e293b',
            borderRadius: 1,  // FASE 1: Reducido de 3 a 1
            border: '2px solid #4ade80'
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, color: '#4ade80' }}>
            Abonos Disponibles
          </Typography>
          <Stack spacing={1}>
            {availableAbonos.map(abn => (
              <FormControlLabel
                key={abn.id}
                control={
                  <Checkbox 
                    onChange={(e) => handleAbonoSelection(abn, e.target.checked)}
                    sx={{ color: '#4ade80' }}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <Typography sx={{ color: '#fff' }}>
                      {new Date(abn.createdAt).toLocaleDateString()}
                    </Typography>
                    <Typography sx={{ color: '#4ade80', fontWeight: 600 }}>
                      ${Number(abn.amount).toFixed(2)}
                    </Typography>
                  </Box>
                }
                sx={{ 
                  m: 0,
                  p: 1,  // FASE 1: Reducido de 1.5 a 1
                  backgroundColor: 'rgba(74,222,128,0.1)',
                  borderRadius: 0.5  // FASE 1: Reducido de 2 a 0.5
                }}
              />
            ))}
          </Stack>
        </Paper>
      )}

      {/* Sección de Totales y Pagos */}
      {selectedInvoices.length > 0 && (
        <>
          {/* Resumen de Montos */}
          <Paper 
            elevation={0}  // FASE 1
            sx={{ 
              p: 2,  // FASE 1: Reducido de 3 a 2
              mb: 3, 
              backgroundColor: '#0f172a',
              borderRadius: 1,  // FASE 1: Reducido de 3 a 1
              border: '2px solid #4ade80'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ color: '#94a3b8' }}>Total Facturas:</Typography>
              <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                ${totalToPay.toFixed(2)}
              </Typography>
            </Box>
            {totalAbonoCredit > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ color: '#4ade80' }}>Crédito por Abonos:</Typography>
                <Typography sx={{ color: '#4ade80', fontWeight: 600 }}>
                  -${totalAbonoCredit.toFixed(2)}
                </Typography>
              </Box>
            )}
            <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.2)' }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
                Total a Cobrar Hoy:
              </Typography>
              <Typography variant="h5" sx={{ color: '#4ade80', fontWeight: 700 }}>
                ${totalToPayInNewMoney.toFixed(2)}
              </Typography>
            </Box>
            
            {/* Badge de IVA */}
            {applyIVA && (
              <Box sx={{ mt: 2, p: 1.5, backgroundColor: '#fb923c', borderRadius: 0.5 }}>  {/* FASE 1: p: 2 → 1.5, borderRadius: 2 → 0.5 */}
                <Typography sx={{ color: '#000', fontWeight: 600, fontSize: '0.9rem' }}>
                  ⚠️ Se aplica IVA ({(IVA_RATE * 100).toFixed(0)}%) a la porción en VES
                </Typography>
                <Typography sx={{ color: '#000', fontSize: '0.85rem', mt: 0.5 }}>
                  Total con IVA: ${totalToPayWithIVA.toFixed(2)}
                </Typography>
              </Box>
            )}
          </Paper>

          {/* FASE 3: Lista de Pagos Agregados */}
          {payments.length > 0 && (
            <Paper 
              elevation={0}  // FASE 1
              sx={{ 
                p: 2,  // FASE 1: Reducido de 3 a 2
                mb: 3, 
                backgroundColor: '#1e293b',
                borderRadius: 1,  // FASE 1: Reducido de 3 a 1
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              <Typography variant="h6" sx={{ mb: 2, color: '#cbd5e1' }}>
                Pagos Agregados
              </Typography>
          <Stack spacing={2}>
            {/* FASE 4: Keys únicas para evitar warnings de React */}
            {payments.map((payment, index) => (
              <PaymentCard
                key={`payment-${payment.method}-${index}-${payment.amount}`}
                payment={payment}
                methodName={paymentMethods?.find(m => m.code === payment.method)?.name}
                onRemove={() => handleRemovePayment(index)}
              />
            ))}
          </Stack>
            </Paper>
          )}

          {/* FASE 3: Botón Agregar Pago */}
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

          {/* Resumen Final y Total Restante */}
          <Paper 
            elevation={0}  // FASE 1
            sx={{ 
              p: 2,  // FASE 1: Reducido de 3 a 2
              mb: 3, 
              backgroundColor: remainingAmountInUSD <= 0.01 ? '#0f172a' : '#1e293b',
              borderRadius: 1,  // FASE 1: Reducido de 3 a 1
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

          {/* Botón Guardar */}
          <Button 
            type="submit" 
            variant="contained" 
            fullWidth 
            size="large"
            disabled={loadingSubmit || Math.abs(remainingAmountInUSD) > 0.01}
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
            {loadingSubmit ? <CircularProgress size={24} sx={{ color: '#64748b' }} /> : 'Guardar Pago'}
          </Button>
        </>
      )}

      {/* FASE 3: Payment Entry Modal */}
      <PaymentEntryModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onConfirm={handlePaymentConfirm}
        remainingAmount={remainingAmountInUSD}
        baseCurrency="USD"
        availableMethods={paymentMethods || []}
        totalBase={totalToPayInNewMoney}        // FASE 4: Monto base sin IVA
        includesIVA={applyIVA}                   // FASE 4: Indica si remainingAmount incluye IVA
      />
    </Box>
  );
};
