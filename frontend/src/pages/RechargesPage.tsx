import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Autocomplete,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import toast from 'react-hot-toast';
import {
  getStaffPhones,
  getRechargesBySessionId,
  createRecharge,
} from '../services/api';

export const RechargesPage = () => {
  const currentSession = useAppStore((s) => s.currentSession);
  const globalSettings = useAppStore((s) => s.globalSettings);
  const fetchGlobalSettings = useAppStore((s) => s.fetchGlobalSettings);
  const bcvRate = useAppStore((s) => s.bcvRate);

  const [staffPhones, setStaffPhones] = useState<any[]>([]);
  const [recharges, setRecharges] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [phoneInput, setPhoneInput] = useState('');
  const [isStaff, setIsStaff] = useState(false);
  const [netAmount, setNetAmount] = useState('');
  const [commissionAmount, setCommissionAmount] = useState('');
  const [commissionManual, setCommissionManual] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH_VES');
  const [currency, setCurrency] = useState<'USD' | 'VES'>('VES');
  const [amountTendered, setAmountTendered] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');

  const commissionPercent = globalSettings?.recharge_commission_percent ?? 10;

  useEffect(() => {
    fetchGlobalSettings();
    getStaffPhones()
      .then((r) => setStaffPhones(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error('No se pudieron cargar teléfonos del personal'));
  }, [fetchGlobalSettings]);

  const loadRecharges = async () => {
    if (!currentSession?.id) {
      setRecharges([]);
      return;
    }
    setLoading(true);
    try {
      const resp = await getRechargesBySessionId(currentSession.id);
      setRecharges(Array.isArray(resp.data) ? resp.data : []);
    } catch {
      setRecharges([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecharges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession?.id]);

  const normalizedPhone = phoneInput.replace(/\D/g, '');

  const matchedStaff = useMemo(
    () => staffPhones.find((p) => p.phone_number === normalizedPhone),
    [staffPhones, normalizedPhone]
  );

  useEffect(() => {
    if (matchedStaff) setIsStaff(true);
  }, [matchedStaff]);

  useEffect(() => {
    const net = Number(netAmount);
    if (!commissionManual && Number.isFinite(net) && net > 0) {
      setCommissionAmount(((net * commissionPercent) / 100).toFixed(2));
    }
  }, [netAmount, commissionPercent, commissionManual]);

  const totalToCharge = useMemo(() => {
    if (isStaff) return 0;
    const net = Number(netAmount) || 0;
    const comm = Number(commissionAmount) || 0;
    return +(net + comm).toFixed(2);
  }, [isStaff, netAmount, commissionAmount]);

  const effectiveRate = useMemo(() => {
    if (currency !== 'USD') return null;
    const tendered = Number(amountTendered);
    const net = Number(netAmount);
    const comm = Number(commissionAmount) || 0;
    const total = net + comm;
    if (!tendered || !total) return null;
    return +(tendered * (Number(bcvRate) || Number(exchangeRate) || 1)).toFixed(2);
  }, [currency, amountTendered, netAmount, commissionAmount, bcvRate, exchangeRate]);

  const handleSave = async () => {
    if (!currentSession?.id) {
      toast.error('Debe iniciar una jornada para registrar recargas');
      return;
    }
    const net = Number(netAmount);
    if (!normalizedPhone || !Number.isFinite(net) || net <= 0) {
      toast.error('Ingrese teléfono y monto neto válido');
      return;
    }

    setSaving(true);
    try {
      await createRecharge({
        phone_number: normalizedPhone,
        is_staff: isStaff,
        net_amount_bs: net,
        commission_amount_bs: Number(commissionAmount) || 0,
        ...(isStaff
          ? {}
          : {
              payment_method: paymentMethod,
              currency,
              amount_tendered: Number(amountTendered),
              exchange_rate:
                currency === 'USD'
                  ? Number(exchangeRate) || Number(bcvRate) || undefined
                  : amountTendered && totalToCharge
                    ? Number(amountTendered) / totalToCharge
                    : undefined,
            }),
      });

      toast.success('Recarga registrada');
      window.dispatchEvent(new Event('rechargeAdded'));
      setPhoneInput('');
      setNetAmount('');
      setCommissionAmount('');
      setAmountTendered('');
      setExchangeRate('');
      setIsStaff(false);
      setCommissionManual(false);
      await loadRecharges();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar recarga');
    } finally {
      setSaving(false);
    }
  };

  if (!currentSession) {
    return (
      <Box sx={{ maxWidth: 800, margin: '0 auto' }}>
        <Alert severity="warning">
          No hay jornada activa. Inicie una jornada desde el Dashboard para registrar recargas.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, margin: '0 auto', width: '100%' }}>
      <Paper sx={{ p: 3, mb: 3, backgroundColor: '#1e293b', border: '1px solid #334155' }}>
        <Typography variant="h5" gutterBottom fontWeight={600}>
          Nueva Recarga de Saldo
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Sin IVA. La comisión por defecto es {commissionPercent}%. Las recargas de personal no
          cobran al cliente pero descuentan saldo prepagado en GIE-APP al cierre.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Autocomplete
            freeSolo
            options={staffPhones.map((p) => p.phone_number)}
            value={phoneInput}
            onInputChange={(_, v) => setPhoneInput(v)}
            renderInput={(params) => (
              <TextField {...params} label="Teléfono" placeholder="Ej: 04141234567" />
            )}
          />

          {matchedStaff && (
            <Typography variant="caption" color="success.main">
              Personal: {matchedStaff.owner_name}
            </Typography>
          )}

          <FormControlLabel
            control={
              <Checkbox
                checked={isStaff}
                onChange={(e) => setIsStaff(e.target.checked)}
                color="secondary"
              />
            }
            label="Es personal de la empresa"
          />

          <TextField
            label="Monto Neto de Recarga (Bs)"
            type="number"
            value={netAmount}
            onChange={(e) => setNetAmount(e.target.value)}
            inputProps={{ min: 0, step: 0.01 }}
          />

          <TextField
            label={`Comisión (Bs) — ${commissionPercent}% por defecto`}
            type="number"
            value={commissionAmount}
            onChange={(e) => {
              setCommissionManual(true);
              setCommissionAmount(e.target.value);
            }}
            inputProps={{ min: 0, step: 0.01 }}
          />

          <TextField
            label="Total a Cobrar (Bs)"
            value={isStaff ? '0.00 (Personal)' : totalToCharge.toFixed(2)}
            InputProps={{ readOnly: true }}
          />

          {!isStaff && (
            <>
              <Divider sx={{ my: 1 }} />
              <FormControl fullWidth>
                <InputLabel>Método de Pago</InputLabel>
                <Select
                  value={paymentMethod}
                  label="Método de Pago"
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    setCurrency(e.target.value === 'CASH_USD' ? 'USD' : 'VES');
                  }}
                >
                  <MenuItem value="CASH_USD">Efectivo USD</MenuItem>
                  <MenuItem value="CASH_VES">Efectivo VES</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label={`Monto Entregado (${currency})`}
                type="number"
                value={amountTendered}
                onChange={(e) => setAmountTendered(e.target.value)}
                helperText="Permite redondeo inverso (ej. billete de $2 para recarga de 1000 Bs)"
                inputProps={{ min: 0, step: 0.01 }}
              />

              {currency === 'USD' && (
                <TextField
                  label="Tasa de Cambio (Bs/$)"
                  type="number"
                  value={exchangeRate || (bcvRate ? String(bcvRate) : '')}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  helperText={
                    effectiveRate
                      ? `Equivalente aprox: ${effectiveRate} Bs`
                      : 'Usa tasa BCV del header si se deja vacío'
                  }
                />
              )}
            </>
          )}

          <Button
            variant="contained"
            size="large"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
            sx={{ alignSelf: 'flex-start', mt: 1 }}
          >
            {saving ? 'Guardando...' : 'Registrar Recarga'}
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, backgroundColor: '#1e293b', border: '1px solid #334155' }}>
        <Typography variant="h6" gutterBottom>
          Recargas de esta jornada
        </Typography>
        {loading ? (
          <CircularProgress size={28} />
        ) : recharges.length === 0 ? (
          <Typography color="text.secondary">Sin recargas registradas</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Teléfono</TableCell>
                <TableCell>Staff</TableCell>
                <TableCell align="right">Neto Bs</TableCell>
                <TableCell align="right">Comisión</TableCell>
                <TableCell align="right">Cobrado</TableCell>
                <TableCell>Pago</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recharges.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.phone_number}</TableCell>
                  <TableCell>{r.is_staff ? 'Sí' : 'No'}</TableCell>
                  <TableCell align="right">{Number(r.net_amount_bs).toFixed(2)}</TableCell>
                  <TableCell align="right">{Number(r.commission_amount_bs).toFixed(2)}</TableCell>
                  <TableCell align="right">{Number(r.total_charged).toFixed(2)}</TableCell>
                  <TableCell>
                    {r.is_staff
                      ? '—'
                      : `${r.payment_method || ''} ${r.amount_tendered ?? ''} ${r.currency || ''}`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
};
