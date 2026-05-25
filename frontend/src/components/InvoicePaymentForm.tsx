import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store';
import { searchClients, getUnpaidInvoices, getAvailableAbonos } from '../services/api';
import { Autocomplete, Box, Button, Checkbox, CircularProgress, FormControlLabel, IconButton, Paper, Stack, TextField, Typography, Select, MenuItem, FormControl, InputLabel, Divider } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import toast from 'react-hot-toast';

interface PaymentState {
  method: string; // ahora guarda payment_method_code (p.ej. 'CASH_USD', 'POS_BANESCO')
  amount: number | string;
  bcvRate?: number | string | undefined;
  currency?: 'USD' | 'VES'; // añadido
}

function parseAmount(value: string | number | null | undefined): number {
  if (value == null) return 0;
  let s = String(value).trim();
  if (!s) return 0;
  s = s.replace(/\s+/g, '');

  if (s.includes('.') && s.includes(',')) {
    // "1.234,56" -> "1234.56"
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

/**
 * payments: [{ method, amount, bcvRate }]
 * totalDueUSD: number (USD, ya incluye IVA si aplica)
 * defaultBcv: number
 * Retorna { totalPaidUSD, totalsByMethod }
 */
// REEMPLAZADA: ahora recibe applyIVA para ajustar la conversión de VES cuando corresponda
function computePaidAndTotals(payments: PaymentState[], paymentMethods: any[], defaultBcv: number) {
  let totalPaidUSD = 0;
  const totalsByMethod: Record<string, number> = {};

  payments.forEach(p => {
    const methodCode = (p.method || '').toString();
    const rawAmount = parseAmount(p.amount);
    totalsByMethod[methodCode] = (totalsByMethod[methodCode] || 0) + rawAmount;

    // resolver moneda del método
    const method = paymentMethods.find((m: any) => m.code === methodCode);
    const currency = method?.currency || (methodCode === 'cash_usd' ? 'USD' : 'VES'); // fallback

    const bcv = Number(p.bcvRate) || defaultBcv || 1;
    if (currency === 'USD') {
      totalPaidUSD += rawAmount;
    } else {
      if (bcv > 0) {
        const baseUSD = rawAmount / bcv;
        // CORRECCIÓN: no dividir por 1.16 aquí — el pago en VES ya equivale al monto total recibido en USD.
        totalPaidUSD += baseUSD;
      }
    }
  });

  return { totalPaidUSD, totalsByMethod };
}

export const InvoicePaymentForm = () => {
    const { addTransaction, bcvRate, paymentMethods, fetchPaymentMethods } = useAppStore();

    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState<any[]>([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [inputValue, setInputValue] = useState('');

    const [selectedClient, setSelectedClient] = useState<any | null>(null);
    const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
    const [selectedInvoices, setSelectedInvoices] = useState<any[]>([]);
    // --- NUEVOS ESTADOS PARA ABONOS ---
    const [availableAbonos, setAvailableAbonos] = useState<any[]>([]);
    const [selectedAbonos, setSelectedAbonos] = useState<any[]>([]);
    const [payments, setPayments] = useState<PaymentState[]>([{ method: '', amount: '' }]);
    const [loadingSubmit, setLoadingSubmit] = useState(false);

    useEffect(() => {
        setUnpaidInvoices([]);
        setSelectedInvoices([]);
        setAvailableAbonos([]);
        setSelectedAbonos([]);

        if (selectedClient) {
            // Cargar facturas pendientes, manejando 404 y mostrando mensaje al usuario
            getUnpaidInvoices(selectedClient.mks_id)
                .then(res => {
                    setUnpaidInvoices(res.data || []);
                })
                .catch(err => {
                    if (err?.response?.data?.message) {
                        toast.error(err.response.data.message);
                    } else {
                        toast.error('Error al buscar facturas.');
                    }
                    setUnpaidInvoices([]);
                });

            // Cargar abonos disponibles (no mostramos toast si falla)
            getAvailableAbonos(selectedClient.mks_id)
                .then(res => setAvailableAbonos(res.data || []))
                .catch(err => {
                    console.error('Error al buscar abonos:', err);
                    setAvailableAbonos([]);
                });
        }
    }, [selectedClient]);

    const handleAbonoSelection = (abono: any, isChecked: boolean) => {
        setSelectedAbonos(prev => isChecked ? [...prev, abono] : prev.filter(abn => abn.id !== abono.id));
    };

    const totalToPay = useMemo(
        () => selectedInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0),
        [selectedInvoices]
    );
    const totalAbonoCredit = useMemo(
        () => selectedAbonos.reduce((sum, abn) => sum + Number(abn.amount), 0),
        [selectedAbonos]
    );
    const totalToPayInNewMoney = totalToPay - totalAbonoCredit;

    // --- CORRECCIÓN 1: Lógica de 'usdPaymentTotal' ---
    const usdPaymentTotal = useMemo(() => {
      return payments
        .filter(p => p.currency === 'USD') // ahora usamos la moneda seleccionada
        .reduce((sum, p) => sum + parseAmount(p.amount), 0);
    }, [payments]);

    // --- CORRECCIÓN: calcular applyIVA (igual que antes) ---
    const { usdPaid, applyIVA } = useMemo(() => {
        if (totalToPayInNewMoney === 0) return { usdPaid: usdPaymentTotal, applyIVA: false };
        const shouldApplyIVA = (usdPaymentTotal / totalToPayInNewMoney) < 0.5;
        return { usdPaid: usdPaymentTotal, applyIVA: shouldApplyIVA };
    }, [usdPaymentTotal, totalToPayInNewMoney]);

    // --- NUEVA LÓGICA: totalToPayWithIVA aplica IVA solo a la porción VES ---
    const totalToPayWithIVA = useMemo(() => {
      if (!applyIVA) return totalToPayInNewMoney;
      const vesPortionBase = Math.max(0, totalToPayInNewMoney - usdPaid);
      const ivaOnVesPortion = vesPortionBase * 0.16; // usa la constante IVA (16%)
      return +(totalToPayInNewMoney + ivaOnVesPortion);
    }, [totalToPayInNewMoney, usdPaid, applyIVA]);

    // --- CORRECCIÓN 2: Renombrar variable no usada ---
    // CORRECCIÓN: usar computePaidAndTotals pasando applyIVA y añadir applyIVA como dependencia
    const { totalPaidUSD, totalsByMethod: _totalsByMethod } = useMemo(() => {
      const defBcv = Number(bcvRate) || 36.5;
      return computePaidAndTotals(payments, paymentMethods || [], defBcv);
    }, [payments, bcvRate, paymentMethods, applyIVA]);

    const totalPaidInUSD = totalPaidUSD;
    const remainingAmountInUSD = Number((totalToPayWithIVA - totalPaidInUSD).toFixed(2));
    // -------------------------------------------------------------------------------

    useEffect(() => {
        if (totalToPayInNewMoney > 0 && payments.length === 1) {
            // Busca el primer método USD disponible
            const defaultUsdMethod = (paymentMethods || []).find((m: any) => m.currency === 'USD') || { code: 'CASH_USD', currency: 'USD' };
            setPayments([{
              method: defaultUsdMethod.code,
              amount: totalToPayInNewMoney.toFixed(2),
              currency: 'USD'
            }]);
        } else if (totalToPayInNewMoney === 0) {
          const first = (paymentMethods && paymentMethods[0]) || { code: '', currency: 'USD' };
          setPayments([{ method: first.code, amount: '', currency: first.currency }]);
        }
    }, [totalToPayInNewMoney, paymentMethods]);

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

    const handleInvoiceSelection = (invoice: any, isChecked: boolean) => {
        setSelectedInvoices(prev => isChecked ? [...prev, invoice] : prev.filter(inv => inv.id !== invoice.id));
    };

    const handlePaymentChange = (index: number, field: keyof PaymentState, value: any) => {
        const newPayments = [...payments];
        const currentPayment = { ...newPayments[index], [field]: value };

        if (field === 'method') {
            const newMethodCode = value as string;
            const selectedMethod = (paymentMethods || []).find((m: any) => m.code === newMethodCode);
            const selectedCurrency = selectedMethod?.currency || 'USD';
            currentPayment.currency = selectedCurrency;

            const otherPayments = newPayments.filter((_, i) => i !== index);
            const defBcv = Number(bcvRate) || 36.5;
            // --- CORRECCIÓN: pasar applyIVA ---
            const { totalPaidUSD: otherPaidUSD } = computePaidAndTotals(otherPayments as PaymentState[], paymentMethods || [], defBcv);

            const remainingUSDForThis = Math.max(0, totalToPayWithIVA - otherPaidUSD);

            if (selectedCurrency === 'VES') {
                const rate = Number(bcvRate) || 36.5;
                currentPayment.bcvRate = rate;
                currentPayment.amount = (remainingUSDForThis * rate).toFixed(2);
            } else {
                currentPayment.bcvRate = undefined;
                currentPayment.amount = remainingUSDForThis > 0 ? remainingUSDForThis.toFixed(2) : '';
            }
            newPayments[index] = currentPayment;
        }

        if (field === 'amount') {
            // actualizar amount; si currency es VES asegurarnos bcvRate existe
            if (currentPayment.currency === 'VES' && !currentPayment.bcvRate) {
                currentPayment.bcvRate = Number(bcvRate) || 36.5;
            }
            newPayments[index] = currentPayment;
        }

        setPayments(newPayments);
    };

    const addPayment = () => {
        const firstMethod = (paymentMethods && paymentMethods[0]) || null;
        const defaultMethodCode = firstMethod ? firstMethod.code : '';
        const defaultCurrency = firstMethod ? firstMethod.currency : 'USD';
        const defaultUsd = remainingAmountInUSD > 0.01 ? remainingAmountInUSD.toFixed(2) : '';
        setPayments([...payments, { method: defaultMethodCode, amount: defaultCurrency === 'USD' ? defaultUsd : (Number(defaultUsd) * (Number(bcvRate)||36.5)).toFixed(2), currency: defaultCurrency, bcvRate: defaultCurrency === 'VES' ? (Number(bcvRate)||36.5) : undefined }]);
    };

    const removePayment = (index: number) => setPayments(payments.filter((_, i) => i !== index));

    const resetForm = () => {
        setSelectedClient(null);
        setInputValue('');
        setAvailableAbonos([]);
        setSelectedAbonos([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingSubmit(true);
        const finalPayments = payments.filter(p => Number(p.amount) > 0.01).map(p => ({
            method: p.method, amount: Number(p.amount), bcvRate: p.bcvRate ? Number(p.bcvRate) : undefined,
        }));
        const payload = { 
            invoiceIds: selectedInvoices.map(inv => inv.id), 
            payments: finalPayments,
            appliedAbonoIds: selectedAbonos.map(abn => abn.id)
        };
        try {
            await addTransaction(payload as any);
            resetForm();
        } finally {
            setLoadingSubmit(false);
        }
    };

    useEffect(() => {
        // si store no tiene métodos aún, cargar
        if (!paymentMethods || paymentMethods.length === 0) {
            fetchPaymentMethods().catch(() => {});
        }
    }, [paymentMethods, fetchPaymentMethods]);

    // Inicializar el primer método cuando los métodos de pago estén disponibles
    useEffect(() => {
      if (paymentMethods && paymentMethods.length > 0 && payments.length === 1 && !payments[0].method) {
        const first = paymentMethods[0];
        setPayments([{ method: first.code, amount: '' , currency: first.currency }]);
      }
      // eslint-disable-next-line
    }, [paymentMethods]);

    return (
        <Box component="form" onSubmit={handleSubmit}>
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
                        label="1. Buscar Cliente"
                        InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                                <>
                                    {loadingSearch ? <CircularProgress size={20} /> : null}
                                    {params.InputProps.endAdornment}
                                </>
                            ),
                        }}
                    />
                )}
                sx={{ mb: 2 }}
            />
            
            {/* SECCIÓN DE FACTURAS */}
            {unpaidInvoices.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Typography>2. Seleccionar Facturas Pendientes:</Typography>
                    {unpaidInvoices.map(inv => (
                        <FormControlLabel
                            key={inv.id}
                            control={<Checkbox onChange={(e) => handleInvoiceSelection(inv, e.target.checked)} />}
                            label={`Factura #${inv.mks_invoice_number} - $${Number(inv.amount).toFixed(2)}`}
                        />
                    ))}
                </Paper>
            )}

            {/* --- NUEVA SECCIÓN DE ABONOS --- */}
            {availableAbonos.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2, borderColor: 'success.main' }}>
                    <Typography color="success.main">Abonos Disponibles:</Typography>
                    {availableAbonos.map(abn => (
                        <FormControlLabel
                            key={abn.id}
                            control={<Checkbox onChange={(e) => handleAbonoSelection(abn, e.target.checked)} color="success" />}
                            label={`Abono de $${Number(abn.amount).toFixed(2)} del ${new Date(abn.createdAt).toLocaleDateString()}`}
                        />
                    ))}
                </Paper>
            )}

            {selectedInvoices.length > 0 && (
                <>
                    <Typography>Total Facturas: ${totalToPay.toFixed(2)}</Typography>
                    <Typography color="success.main">Crédito por Abonos: -${totalAbonoCredit.toFixed(2)}</Typography>
                    <Typography variant="h5" color="primary" gutterBottom>
                        Total a Cobrar Hoy: ${totalToPayInNewMoney.toFixed(2)}
                    </Typography>

                    <Stack spacing={2} sx={{ my: 2 }}>
                        {payments.map((p, index) => (
                            <Stack direction="row" spacing={1} key={index} alignItems="center">
                                <FormControl size="small" sx={{ flex: 1, minWidth: 150 }}>
                                    <InputLabel>Método</InputLabel>
                                    <Select value={p.method} label="Método" onChange={(e) => handlePaymentChange(index, 'method', e.target.value)}>
                                        {(paymentMethods || []).map((method: any) => (
                                            <MenuItem key={method.code} value={method.code}>
                                                {method.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <TextField sx={{ flex: 1 }} type="number" inputProps={{ step: "0.01" }} label="Monto" size="small" value={p.amount} onChange={(e) => handlePaymentChange(index, 'amount', e.target.value)} required />
                                {p.currency === 'VES' && <TextField sx={{ flex: 0.8 }} type="number" label="Tasa BCV" size="small" value={p.bcvRate || ''} InputProps={{ readOnly: true }} />}
                                <IconButton onClick={() => removePayment(index)} color="warning"><DeleteOutlineIcon /></IconButton>
                            </Stack>
                        ))}
                    </Stack>
                    <Button startIcon={<AddCircleOutlineIcon />} onClick={addPayment}>Añadir Método de Pago</Button>
                    <Box sx={{ mt: 2, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
                        <Typography variant="body2">Total Base: ${totalToPay.toFixed(2)}</Typography>
                        {applyIVA && <Typography color="warning.main" variant="body2">Se aplica IVA (16%)</Typography>}
                        <Typography variant="h6">Total a Pagar (calculado): ${totalToPayWithIVA.toFixed(2)}</Typography>
                        <Divider sx={{ my: 1 }} />
                        <Typography>Pagado en USD: ${usdPaid.toFixed(2)}</Typography>
                        <Typography>Total Ingresado (Equivalente USD): ${totalPaidInUSD.toFixed(2)}</Typography>
                        <Typography color={Math.abs(remainingAmountInUSD) > 0.01 ? 'error' : 'success.main'} fontWeight="bold">
                            Monto Restante (Base USD): ${remainingAmountInUSD.toFixed(2)}
                        </Typography>
                    </Box>
                    <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }} disabled={loadingSubmit || Math.abs(remainingAmountInUSD) > 0.01}>
                        {loadingSubmit ? <CircularProgress size={24} /> : 'Guardar Pago'}
                    </Button>
                </>
            )}
        </Box>
    );
};