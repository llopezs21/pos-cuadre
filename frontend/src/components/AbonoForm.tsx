import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { searchClients } from '../services/api';
import { Autocomplete, Box, Button, CircularProgress, Stack, TextField, Typography, Select, MenuItem, FormControl, InputLabel } from '@mui/material';

export const AbonoForm = () => {
  const { createAbono, paymentMethods, fetchPaymentMethods, bcvRate } = useAppStore();
  const [payments, setPayments] = useState([{ method: '', amount: '', currency: 'USD' }]);
  
  // Estados para el buscador de cliente
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Estados para el formulario de abono
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'VES'>('USD');
  const [paymentMethod, setPaymentMethod] = useState<'cash_usd' | 'cash_ves' | 'pos_banesco' | 'pos_mibanco'>('cash_usd');
  const [notes, setNotes] = useState('');
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  useEffect(() => {
    if (inputValue === '' || !open) { setOptions([]); return; }
    setLoadingSearch(true);
    const timer = setTimeout(async () => {
        try {
            const response = await searchClients(inputValue);
            setOptions(response.data);
        } finally { setLoadingSearch(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [inputValue, open]);

  useEffect(() => {
    if (!paymentMethods || paymentMethods.length === 0) {
      fetchPaymentMethods().catch(() => {});
    }
  }, [paymentMethods, fetchPaymentMethods]);

  useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0 && payments.length === 1 && !payments[0].method) {
      const first = paymentMethods[0];
      setPayments([{ method: first.code, amount: '', currency: first.currency }]);
    }
    // eslint-disable-next-line
  }, [paymentMethods]);

  const resetForm = () => {
    setSelectedClient(null);
    setInputValue('');
    setAmount('');
    setCurrency('USD');
    setPaymentMethod('cash_usd');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // construir payload: incluir payment_method_code en cada payment
    const defBcv = Number(bcvRate) || 36.5;

    // Calcular el "monto base" en USD que se enviará al backend.
    // Si la moneda es VES, aplicamos (ves / 1.16) / bcvRate
    const baseAmountUSD = currency === 'USD'
      ? Number(amount)
      : (Number(amount) / 1.16) / defBcv;

    const payload = {
        client_mks_id: selectedClient.mks_id,
        amount: Number(baseAmountUSD.toFixed(6)), // redondeo razonable
        currency,
        bcv_rate: currency === 'VES' ? defBcv : undefined,
        notes,
        payment: {
            method: paymentMethod,
            amount: Number(amount), // monto tal como fue ingresado (en la moneda seleccionada)
            bcvRate: paymentMethod !== 'cash_usd' ? defBcv : undefined,
        }
    };

    try {
        await createAbono(payload as any);
        resetForm();
    } finally {
        setLoadingSubmit(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
            <Typography variant="h6">Registrar un Pago Parcial (Abono)</Typography>
            <Autocomplete
                open={open} onOpen={() => setOpen(true)} onClose={() => setOpen(false)}
                options={options} loading={loadingSearch} filterOptions={(x) => x}
                getOptionLabel={(option) => `${option.name} - ${option.id_number}` || ""}
                isOptionEqualToValue={(option, value) => option.mks_id === value.mks_id}
                onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
                onChange={(_, newValue) => setSelectedClient(newValue)}
                value={selectedClient}
                renderInput={(params) => (<TextField {...params} label="1. Buscar Cliente" required InputProps={{...params.InputProps, endAdornment: (<>{loadingSearch ? <CircularProgress size={20} /> : null}{params.InputProps.endAdornment}</>)}} />)}
            />

            <Typography>2. Monto del Abono</Typography>
            <Stack direction="row" spacing={2}>
                <TextField label="Monto" type="number" inputProps={{ step: "0.01" }} value={amount} onChange={(e) => setAmount(e.target.value)} required fullWidth/>
                <FormControl fullWidth>
                    <InputLabel>Moneda</InputLabel>
                    <Select value={currency} label="Moneda" onChange={(e) => setCurrency(e.target.value as any)}>
                        <MenuItem value="USD">USD ($)</MenuItem>
                        <MenuItem value="VES">VES (Bs.)</MenuItem>
                    </Select>
                </FormControl>
            </Stack>

            <FormControl fullWidth>
                <InputLabel>3. Método de Pago del Abono</InputLabel>
                <Select value={paymentMethod} label="3. Método de Pago del Abono" onChange={(e) => setPaymentMethod(e.target.value as any)}>
                    {paymentMethods.map(m => <MenuItem key={m.code} value={m.code}>{m.name}</MenuItem>)}
                </Select>
            </FormControl>

            <TextField label="Notas (Opcional)" multiline rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

            <Button type="submit" variant="contained" fullWidth disabled={loadingSubmit || !selectedClient || !amount}>
                {loadingSubmit ? <CircularProgress size={24} /> : 'Guardar Abono'}
            </Button>
        </Stack>
    </Box>
  );
};