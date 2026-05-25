import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store';
import { searchClients, getDailyBcvRate } from '../services/api';
import { Autocomplete, Box, Button, CircularProgress, Stack, TextField, Typography, Select, MenuItem, FormControl, InputLabel, IconButton, Divider } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

// --- Reemplazo/Adición: PaymentState y helpers (mismo patrón que InvoicePaymentForm) ---
type PaymentState = {
  method: string; // payment_method_code
  amount: number | string;
  bcvRate?: number | string | undefined;
  currency?: 'USD' | 'VES';
};

function parseAmount(value: string | number | null | undefined): number {
  if (value == null) return 0;
  let s = String(value).trim();
  if (!s) return 0;
  s = s.replace(/\s+/g, '');

  if (s.includes('.') && s.includes(',')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    s = s.replace(/,/g, '.');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function computePaidAndTotals(payments: PaymentState[], paymentMethods: any[], defaultBcv: number) {
  let totalPaidUSD = 0;
  const totalsByMethod: Record<string, number> = {};
  payments.forEach(p => {
    const methodCode = (p.method || '').toString();
    const rawAmount = parseFloat(String(p.amount || 0)) || 0;
    totalsByMethod[methodCode] = (totalsByMethod[methodCode] || 0) + rawAmount;
    const method = paymentMethods.find((m: any) => m.code === methodCode);
    const currency = method?.currency || 'USD';
    const bcv = Number(p.bcvRate) || defaultBcv || 1;
    if (currency === 'USD') {
      totalPaidUSD += rawAmount;
    } else {
      if (bcv > 0) {
        totalPaidUSD += rawAmount / bcv; // sumar equivalente USD real
      }
    }
  });
  return { totalPaidUSD, totalsByMethod };
}

/* ---------- FIN HELPERS ---------- */

export const ManualEntryForm = () => {
  const { addTransaction, paymentMethods, fetchPaymentMethods, bcvRate } = useAppStore();
  
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [invoiceType, setInvoiceType] = useState<'support' | 'installation'>('support');
  const [invoiceBaseUSD, setInvoiceBaseUSD] = useState('');
  const [notes, setNotes] = useState('');
  const [payments, setPayments] = useState<PaymentState[]>([{ method: '', amount: '' }]);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  // --- NUEVO ESTADO: tasa diaria BCV ---
  const [dailyBcvRate, setDailyBcvRate] = useState<number | null>(null);
  // --- FIN NUEVO ESTADO ---

  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const totalToPay = Number(invoiceBaseUSD) || 0;

  // --- LÓGICA DE TASA BCV: usar diaria si está disponible, si no fallback al store ---
  const bcvToUse = dailyBcvRate || Number(bcvRate) || 36.5;
  // --- FIN LÓGICA BCV ---

  // --- calcular applyIVA igual que antes (se basa en USD pagos) ---
  const usdPaymentTotal = useMemo(() => {
    return payments
      .filter(p => p.currency === 'USD') // <-- CORREGIDO: usar currency en vez de method
      .reduce((sum, p) => sum + parseAmount(p.amount), 0);
  }, [payments]);

  const { applyIVA } = useMemo(() => {
    if (totalToPay === 0) return { applyIVA: false };
    return { applyIVA: (usdPaymentTotal / totalToPay) < 0.5 };
  }, [usdPaymentTotal, totalToPay]);

  // --- AÑADIDO: totalToPayWithIVA aplica IVA solo a la porción VES ---
  const totalToPayWithIVA = useMemo(() => {
    if (!applyIVA) return totalToPay;
    const vesPortionBase = Math.max(0, totalToPay - usdPaymentTotal);
    const ivaOnVesPortion = vesPortionBase * 0.16;
    return +(totalToPay + ivaOnVesPortion);
  }, [totalToPay, usdPaymentTotal, applyIVA]);
  // --- FIN AÑADIDO ---

  // --- calcular pagos contra la BASE USD (considerando IVA solo para métodos VES) ---
  const { totalPaidUSD } = useMemo(() => {
    const defBcv = bcvToUse; // usar tasa diaria si existe
    return computePaidAndTotals(payments as any, paymentMethods, defBcv);
  }, [payments, bcvToUse, applyIVA, paymentMethods]); // añadir bcvToUse como dependencia

  const totalPaidInUSD = totalPaidUSD;
  // ---------------------------------------
  // CORRECCIÓN: ahora restamos contra totalToPayWithIVA
  const remainingAmountInUSD = Number((totalToPayWithIVA - totalPaidInUSD).toFixed(2));
  // ---------------------------------------

  useEffect(() => {
    if (totalToPay > 0 && payments.length === 1 && payments[0].amount === '') {
      setPayments([{ method: 'cash_usd', amount: totalToPay.toFixed(2) }]);
    }
  }, [totalToPay]);
  
  // --- NUEVO: cargar la tasa BCV diaria al montar ---
  useEffect(() => {
    getDailyBcvRate()
      .then(rate => {
        if (rate && typeof rate === 'number') setDailyBcvRate(rate);
      })
      .catch(err => {
        console.error('Error fetching daily BCV rate', err);
        // keep fallback; no further action
      });
  }, []);
  // --- FIN NUEVO USEEFFECT ---

  useEffect(() => {
    if (inputValue === '' || !open) { setOptions([]); return; }
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

  // inicializar método por defecto cuando paymentMethods cargue
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

  const handlePaymentChange = (index: number, field: keyof PaymentState, value: any) => {
    const newPayments = [...payments];
    const currentPayment = { ...newPayments[index], [field]: value };

    if (field === 'method') {
      const newMethodCode = value as string;
      const selectedMethod = (paymentMethods || []).find((m: any) => m.code === newMethodCode);
      const selectedCurrency = selectedMethod?.currency || 'USD';
      currentPayment.currency = selectedCurrency;

      const otherPayments = newPayments.filter((_, i) => i !== index);
      const defBcv = bcvToUse; // usar tasa diaria
      const otherPaidUSD = otherPayments.reduce((s, p) => {
        const amt = Number(p.amount) || 0;
        const method = (paymentMethods || []).find((m: any) => m.code === p.method);
        const cur = method?.currency || 'USD';
        return s + (cur === 'USD' ? amt : (defBcv > 0 ? amt / defBcv : 0));
      }, 0);

      // --- CORRECCIÓN: usar totalToPayWithIVA al autocompletar ---
      const remainingUSDForThis = Math.max(0, totalToPayWithIVA - otherPaidUSD);
      // --- FIN CORRECCIÓN ---

      if (selectedCurrency === 'VES') {
        const rate = bcvToUse; // usar tasa diaria
        currentPayment.bcvRate = rate;
        currentPayment.amount = (remainingUSDForThis * rate).toFixed(2);
      } else {
        currentPayment.bcvRate = undefined;
        currentPayment.amount = remainingUSDForThis > 0 ? remainingUSDForThis.toFixed(2) : '';
      }

      newPayments[index] = currentPayment;
    }

    if (field === 'amount') {
      if (currentPayment.currency === 'VES' && !currentPayment.bcvRate) {
        currentPayment.bcvRate = bcvToUse; // usar tasa diaria
      }
      newPayments[index] = currentPayment;
    }

    setPayments(newPayments);
  };

  const addPayment = () => {
    const firstMethod = (paymentMethods && paymentMethods[0]) || null;
    const defaultMethodCode = firstMethod ? firstMethod.code : '';
    const defaultCurrency = firstMethod ? firstMethod.currency : 'USD';
    const defaultUsd = 0; // ...existing logic to compute remaining...
    const rate = bcvToUse; // usar tasa diaria
    setPayments([...payments, { method: defaultMethodCode, amount: defaultCurrency === 'USD' ? defaultUsd : (Number(defaultUsd) * rate).toFixed(2), currency: defaultCurrency, bcvRate: defaultCurrency === 'VES' ? rate : undefined }]);
  };
  
  const removePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingSubmit(true);

    const finalPayments = payments.filter(p => Number(p.amount) > 0).map(p => ({
        ...p,
        amount: Number(p.amount),
        bcvRate: p.bcvRate ? Number(p.bcvRate) : undefined,
    }));
    
    const payload = {
        clientName: selectedClient.name,
        invoiceType,
        invoiceBaseUSD: totalToPay,
        notes,
        payments: finalPayments,
    };

    try {
        await addTransaction(payload as any);
        setSelectedClient(null);
        setInvoiceBaseUSD('');
        setNotes('');
        setPayments([{ method: 'cash_usd', amount: '' }]);
    } finally {
        setLoadingSubmit(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
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

            <FormControl fullWidth>
                <InputLabel>2. Tipo de Registro</InputLabel>
                <Select value={invoiceType} label="2. Tipo de Registro" onChange={(e) => setInvoiceType(e.target.value as any)}>
                    <MenuItem value="support">Soporte</MenuItem>
                    <MenuItem value="installation">Instalación</MenuItem>
                </Select>
            </FormControl>

            <TextField label="3. Monto Base USD" type="number" inputProps={{ step: "0.01" }} value={invoiceBaseUSD} onChange={(e) => setInvoiceBaseUSD(e.target.value)} required />
            <TextField label="Notas Adicionales" multiline rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

            <Typography variant="h6">4. Ingresar Pagos</Typography>
            <Stack spacing={2}>
                {payments.map((p, index) => (
                    <Stack direction="row" spacing={1} key={index} alignItems="center">
                        <FormControl size="small" fullWidth>
                          <InputLabel>Método</InputLabel>
                          <Select
                            value={p.method}
                            label="Método"
                            onChange={(e) => handlePaymentChange(index, 'method', e.target.value)}
                          >
                            {paymentMethods.map(m => <MenuItem key={m.code} value={m.code}>{m.name}</MenuItem>)}
                          </Select>
                        </FormControl>
                        <TextField fullWidth type="number" inputProps={{ step: "0.01" }} label="Monto" size="small" value={p.amount} onChange={(e) => handlePaymentChange(index, 'amount', e.target.value)} required />
                        {p.currency === 'VES' && <TextField type="number" label="Tasa BCV" size="small" value={p.bcvRate || ''} InputProps={{ readOnly: true }} />}
                        <IconButton onClick={() => removePayment(index)} color="warning"><DeleteOutlineIcon /></IconButton>
                    </Stack>
                ))}
            </Stack>
            <Button startIcon={<AddCircleOutlineIcon />} onClick={addPayment}>Añadir Pago</Button>
            
            {/* REEMPLAZAR el Box resumen por este bloque (muestra base, IVA, totales) */}
            <Box sx={{ mt: 2, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="body2">Total Base: ${totalToPay.toFixed(2)}</Typography>
              {applyIVA && <Typography color="warning.main" variant="body2">Se aplica IVA (16% sobre porción VES)</Typography>}
              <Typography variant="h6">Total a Pagar (calculado): ${totalToPayWithIVA.toFixed(2)}</Typography>
              <Divider sx={{ my: 1 }} />
              <Typography>Pagado en USD (Directo): ${usdPaymentTotal.toFixed(2)}</Typography>
              <Typography>Total Ingresado (Equivalente USD): ${totalPaidInUSD.toFixed(2)}</Typography>
              <Typography color={Math.abs(remainingAmountInUSD) > 0.01 ? 'error' : 'success.main'} fontWeight="bold">
                Monto Restante (Base USD): ${remainingAmountInUSD.toFixed(2)}
              </Typography>
            </Box>

            <Button type="submit" variant="contained" fullWidth disabled={loadingSubmit || !selectedClient || Math.abs(remainingAmountInUSD) > 0.01} sx={{mt: 2}}>
                {loadingSubmit ? <CircularProgress size={24} /> : 'Guardar Registro Manual'}
            </Button>
        </Stack>
    </Box>
  );
};