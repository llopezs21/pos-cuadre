import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Stack,
  Paper,
  Divider,
  IconButton,
  Chip,
  Alert,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import CalculateIcon from '@mui/icons-material/Calculate';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useAppStore } from '../../store';

interface PaymentEntryModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (payment: PaymentEntry) => void;
  remainingAmount: number;  // Monto restante (ya incluye IVA si aplica)
  baseCurrency: 'USD' | 'VES';
  availableMethods: any[];
  totalBase?: number;       // FASE 4: Monto base sin IVA (opcional)
  includesIVA?: boolean;    // FASE 4: Indica si remainingAmount incluye IVA
}

export interface PaymentEntry {
  method: string;
  amount: number;
  currency: 'USD' | 'VES';
  bcvRate?: number;
  reference?: string;
  tenderedAmount?: number;
  changeAmount?: number;
}

interface BillDenomination {
  value: number;
  count: number;
}

export const PaymentEntryModal = ({
  open,
  onClose,
  onConfirm,
  remainingAmount,
  baseCurrency,
  availableMethods,
  totalBase,        // FASE 4
  includesIVA = false // FASE 4: Por defecto false
}: PaymentEntryModalProps) => {
  const { bcvRate } = useAppStore();
  
  // Estados principales
  const [selectedMethodCode, setSelectedMethodCode] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  
  // FASE 2: Estado para input directo de monto entregado
  const [manualAmount, setManualAmount] = useState<string>('');
  const [showBillCalculator, setShowBillCalculator] = useState<boolean>(false);
  
  // Estados para calculadora de billetes
  const [bills, setBills] = useState<BillDenomination[]>([
    { value: 100, count: 0 },
    { value: 50, count: 0 },
    { value: 20, count: 0 },
    { value: 10, count: 0 },
    { value: 5, count: 0 },
    { value: 1, count: 0 }
  ]);
  
  // Obtener método seleccionado
  const selectedMethod = useMemo(() => {
    return availableMethods.find(m => m.code === selectedMethodCode);
  }, [selectedMethodCode, availableMethods]);
  
  const isCashMethod = selectedMethod?.is_cash === true;
  const currency = selectedMethod?.currency || 'USD';
  
  // FASE 2: Calcular total entregado (prioridad: input manual > calculadora de billetes)
  const tenderedAmount = useMemo(() => {
    // Si hay un monto manual ingresado, úsalo
    if (manualAmount && parseFloat(manualAmount) > 0) {
      return parseFloat(manualAmount);
    }
    // Si no, usar la calculadora de billetes
    return bills.reduce((sum, bill) => sum + (bill.value * bill.count), 0);
  }, [manualAmount, bills]);
  
  // Calcular monto a pagar en la moneda del método
  const amountInMethodCurrency = useMemo(() => {
    if (currency === baseCurrency) {
      return remainingAmount;
    }
    
    // Convertir USD a VES o viceversa
    const rate = Number(bcvRate) || 1;
    if (currency === 'VES' && baseCurrency === 'USD') {
      return remainingAmount * rate;
    } else if (currency === 'USD' && baseCurrency === 'VES') {
      return remainingAmount / rate;
    }
    
    return remainingAmount;
  }, [remainingAmount, baseCurrency, currency, bcvRate]);
  
  // Calcular vuelto (solo para efectivo)
  const changeAmount = useMemo(() => {
    if (!isCashMethod) return 0;
    const change = tenderedAmount - amountInMethodCurrency;
    return change > 0 ? change : 0;
  }, [isCashMethod, tenderedAmount, amountInMethodCurrency]);
  
  // FASE 3 (CRÍTICA): Validar si se puede confirmar - PERMISIVO
  const canConfirm = useMemo(() => {
    if (!selectedMethod) return false;
    
    if (isCashMethod) {
      // FASE 3: Para efectivo - solo verificar que haya algo ingresado
      // No forzar coincidencia exacta - el usuario puede pagar de más y recibir vuelto
      return tenderedAmount > 0;
    } else {
      // Para no efectivo: verificar que haya una referencia
      return reference.trim().length > 0;
    }
  }, [selectedMethod, isCashMethod, tenderedAmount, reference]);
  
  // Resetear estados al abrir el modal
  useEffect(() => {
    if (open) {
      setSelectedMethodCode('');
      setReference('');
      setManualAmount('');  // FASE 2
      setShowBillCalculator(false);  // FASE 2
      setBills([
        { value: 100, count: 0 },
        { value: 50, count: 0 },
        { value: 20, count: 0 },
        { value: 10, count: 0 },
        { value: 5, count: 0 },
        { value: 1, count: 0 }
      ]);
    }
  }, [open]);
  
  // Manejar cambio en cantidad de billetes
  const handleBillCountChange = (value: number, count: string) => {
    const newCount = Math.max(0, parseInt(count) || 0);
    setBills(prev => prev.map(bill => 
      bill.value === value ? { ...bill, count: newCount } : bill
    ));
  };
  
  // Confirmar pago
  const handleConfirm = () => {
    if (!selectedMethod || !canConfirm) return;
    
    const payment: PaymentEntry = {
      method: selectedMethod.code,
      amount: isCashMethod ? tenderedAmount : amountInMethodCurrency,
      currency: currency,
      bcvRate: currency === 'VES' ? Number(bcvRate) : undefined,
      reference: isCashMethod ? undefined : reference.trim(),
      tenderedAmount: isCashMethod ? tenderedAmount : undefined,
      changeAmount: isCashMethod && changeAmount > 0 ? changeAmount : undefined
    };
    
    onConfirm(payment);
    onClose();
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="xs"  // PARCHE: Cambiado de "sm" a "xs" para mejor proporción
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#1e293b',
          backgroundImage: 'none',
          borderRadius: 1,
          minWidth: { xs: '320px', sm: '400px' }  // PARCHE: Ancho mínimo para evitar compresión
        }
      }}
    >
      {/* Header */}
      <DialogTitle sx={{ 
        backgroundColor: '#0f172a', 
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        p: 2  // FASE 1: Reducido de 3 a 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AttachMoneyIcon />
          <Typography variant="h6">Agregar Pago</Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: '#fff' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      {/* Content */}
      <DialogContent sx={{ p: 2 }}>  {/* FASE 1: Reducido de 3 a 2 */}
        <Stack spacing={2}>  {/* FASE 1: Reducido de 3 a 2 */}
          {/* Monto a Pagar */}
          <Paper elevation={0} sx={{ p: 2, backgroundColor: '#0f172a', borderRadius: 1, border: '1px solid rgba(255,255,255,0.1)' }}>
            <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 1 }}>
              Monto a Pagar:
            </Typography>
            <Typography variant="h4" sx={{ 
              color: baseCurrency === 'USD' ? '#4ade80' : '#fb923c',
              fontWeight: 700
            }}>
              {baseCurrency === 'USD' ? '$' : 'Bs '}{remainingAmount.toFixed(2)}
            </Typography>
            {/* FASE 4: Mensaje informativo de IVA */}
            {includesIVA && totalBase !== undefined && (
              <Typography variant="caption" sx={{ color: '#94a3b8', mt: 0.5, display: 'block', fontStyle: 'italic' }}>
                (Incluye IVA • Base: {baseCurrency === 'USD' ? '$' : 'Bs '}{totalBase.toFixed(2)})
              </Typography>
            )}
            {currency !== baseCurrency && (
              <Typography variant="body2" sx={{ color: '#64748b', mt: 1 }}>
                ≈ {currency === 'USD' ? '$' : 'Bs '}{amountInMethodCurrency.toFixed(2)} {currency}
              </Typography>
            )}
          </Paper>
          
          {/* Selector de Método */}
          <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>  {/* PARCHE VISUAL: mb: 3 para separación */}
            <InputLabel 
              id="payment-method-label"
              sx={{ 
                color: '#cbd5e1',
                '&.Mui-focused': { color: '#60a5fa' }
              }}
            >
              1. Seleccionar Método de Pago
            </InputLabel>
            <Select
              labelId="payment-method-label"
              value={selectedMethodCode}
              onChange={(e) => setSelectedMethodCode(e.target.value)}
              label="1. Seleccionar Método de Pago"
              sx={{
                backgroundColor: '#0f172a',
                color: '#fff',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255,255,255,0.2)'
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255,255,255,0.3)'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#60a5fa'
                },
                '& .MuiSvgIcon-root': {
                  color: '#cbd5e1'
                }
              }}
            >
              {availableMethods
                .filter(m => m.is_active)
                .map(method => (
                  <MenuItem 
                    key={method.code} 
                    value={method.code}
                    sx={{
                      color: '#fff',
                      backgroundColor: '#1e293b',
                      '&:hover': {
                        backgroundColor: method.currency === 'USD' 
                          ? 'rgba(74,222,128,0.2)' 
                          : 'rgba(251,146,60,0.2)'
                      },
                      '&.Mui-selected': {
                        backgroundColor: method.currency === 'USD' 
                          ? 'rgba(74,222,128,0.25)' 
                          : 'rgba(251,146,60,0.25)',
                        '&:hover': {
                          backgroundColor: method.currency === 'USD' 
                            ? 'rgba(74,222,128,0.35)' 
                            : 'rgba(251,146,60,0.35)'
                        }
                      }
                    }}
                  >
                    {method.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          
          {/* FASE 2: Input Único para Monto Entregado (solo para efectivo) */}
          {selectedMethod && isCashMethod && (
            <>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <LocalAtmIcon sx={{ color: '#60a5fa' }} />
                  <Typography variant="subtitle2" sx={{ color: '#cbd5e1' }}>
                    2. Monto Entregado
                  </Typography>
                </Box>
                
                {/* Input Principal Grande */}
                <TextField
                  fullWidth
                  type="text"  // PARCHE VISUAL: Cambiado de "number" a "text" para eliminar flechas nativas
                  value={manualAmount}
                  onChange={(e) => {
                    // PARCHE VISUAL: Validación de solo números y punto decimal
                    if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                      setManualAmount(e.target.value);
                    }
                  }}
                  placeholder="Ej: 100.00"
                  label={`Monto entregado (${currency})`}
                  inputProps={{ 
                    inputMode: 'decimal'  // PARCHE VISUAL: inputMode para teclado numérico en móviles
                  }}
                  InputLabelProps={{ 
                    shrink: true  // PARCHE VISUAL: Fuerza el label arriba para evitar traslape
                  }}
                  sx={{
                    mb: 1,
                    '& .MuiInputBase-root': {
                      backgroundColor: '#0f172a',
                      color: '#fff',
                      fontSize: '1.05rem',  // PARCHE: Reducido de 1.2rem a 1.05rem para mejor proporción
                      fontWeight: 600
                    },
                    '& .MuiInputBase-input': {
                      py: 1.5,
                      px: 1.5  // PARCHE: Padding horizontal para mejor espaciado
                    },
                    '& .MuiFormLabel-root': {
                      color: '#94a3b8',
                      fontSize: '0.95rem'  // PARCHE: Label proporcionado
                    }
                  }}
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        onClick={() => setShowBillCalculator(!showBillCalculator)}
                        sx={{ color: '#60a5fa', mr: 0.5 }}  // PARCHE: Margen para espacio
                        size="small"
                      >
                        <CalculateIcon />
                      </IconButton>
                    )
                  }}
                />
                
                {/* Botón/Texto para abrir calculadora */}
                <Button
                  size="small"
                  onClick={() => setShowBillCalculator(!showBillCalculator)}
                  startIcon={showBillCalculator ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  sx={{ 
                    color: '#60a5fa', 
                    fontSize: '0.85rem',
                    textTransform: 'none',
                    mb: 1
                  }}
                >
                  {showBillCalculator ? 'Ocultar' : 'Usar'} calculadora de billetes
                </Button>
                
                {/* Calculadora de Billetes (Collapse) */}
                <Collapse in={showBillCalculator}>
                  <Box sx={{ 
                    p: 1.5, 
                    backgroundColor: '#0f172a', 
                    borderRadius: 0.5, 
                    border: '1px solid rgba(255,255,255,0.1)',
                    mb: 1.5
                  }}>
                    <Stack spacing={0.8}>
                      {bills.map(bill => (
                        <Box 
                          key={bill.value}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            p: 0.8,
                            backgroundColor: '#1e293b',
                            borderRadius: 0.5
                          }}
                        >
                          <Box sx={{ flex: '0 0 70px' }}>
                            <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                              {currency === 'USD' ? '$' : 'Bs '}{bill.value}
                            </Typography>
                          </Box>
                          <TextField
                            type="number"
                            value={bill.count || ''}
                            onChange={(e) => handleBillCountChange(bill.value, e.target.value)}
                            placeholder="0"
                            size="small"
                            inputProps={{ min: 0, step: 1 }}
                            sx={{
                              flex: '0 0 80px',
                              '& .MuiInputBase-root': {
                                backgroundColor: '#0f172a',
                                color: '#fff',
                                fontSize: '0.9rem'
                              },
                              '& .MuiInputBase-input': {
                                py: 0.5,
                                px: 1
                              }
                            }}
                          />
                          <Box sx={{ flex: 1, textAlign: 'right' }}>
                            <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                              = {currency === 'USD' ? '$' : 'Bs '}{(bill.value * bill.count).toFixed(2)}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#64748b', fontStyle: 'italic' }}>
                      Los billetes calculados actualizarán el monto automáticamente
                    </Typography>
                  </Box>
                </Collapse>
                
                {/* Total Entregado y Vuelto */}
                <Paper elevation={0} sx={{ 
                  p: 1.5,
                  backgroundColor: '#0f172a',
                  border: '2px solid',
                  borderColor: tenderedAmount >= amountInMethodCurrency ? '#4ade80' : '#fb923c',
                  borderRadius: 0.5
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                    <Typography sx={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Total Entregado:</Typography>
                    <Typography sx={{ color: '#fff', fontWeight: 700 }}>
                      {currency === 'USD' ? '$' : 'Bs '}{tenderedAmount.toFixed(2)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                    <Typography sx={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Monto a Pagar:</Typography>
                    <Typography sx={{ color: '#fff', fontWeight: 700 }}>
                      {currency === 'USD' ? '$' : 'Bs '}{amountInMethodCurrency.toFixed(2)}
                    </Typography>
                  </Box>
                  {changeAmount > 0 && (
                    <>
                      <Divider sx={{ my: 0.8, borderColor: 'rgba(255,255,255,0.2)' }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ color: '#4ade80', fontWeight: 600 }}>
                          Vuelto:
                        </Typography>
                        <Typography sx={{ color: '#4ade80', fontWeight: 700, fontSize: '1.1rem' }}>
                          {currency === 'USD' ? '$' : 'Bs '}{changeAmount.toFixed(2)}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Paper>
                
                {/* FASE 2: Alerta informativa (no bloqueante) */}
                {tenderedAmount < amountInMethodCurrency && tenderedAmount > 0 && (
                  <Alert severity="info" sx={{ mt: 1.5 }}>
                    Falta: {currency === 'USD' ? '$' : 'Bs '}{(amountInMethodCurrency - tenderedAmount).toFixed(2)}. El pago será parcial.
                  </Alert>
                )}
              </Box>
            </>
          )}
          
          {/* Input de Referencia (solo para NO efectivo) */}
          {selectedMethod && !isCashMethod && (
            <>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <ReceiptIcon sx={{ color: '#60a5fa' }} />
                  <Typography variant="subtitle2" sx={{ color: '#cbd5e1' }}>
                    2. Número de Referencia
                  </Typography>
                </Box>
                
                <TextField
                  fullWidth
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ej: 1234567890"
                  label="REF:"
                  required
                  helperText="Ingrese el número de referencia de la transacción"
                  sx={{
                    '& .MuiInputBase-root': {
                      backgroundColor: '#0f172a',
                      color: '#fff'
                    },
                    '& .MuiFormLabel-root': {
                      color: '#94a3b8'
                    },
                    '& .MuiFormHelperText-root': {
                      color: '#64748b'
                    }
                  }}
                />
                
                {/* Resumen del pago */}
                <Paper elevation={0} sx={{ p: 1.5, mt: 2, backgroundColor: '#0f172a', borderRadius: 0.5, border: '1px solid rgba(255,255,255,0.1)' }}>  {/* FASE 1: elevation={0}, borderRadius: 0.5, border */}
                  <Typography variant="subtitle2" sx={{ color: '#cbd5e1', mb: 1 }}>
                    Resumen del Pago:
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#fff' }}>Monto:</Typography>
                    <Typography sx={{ color: '#4ade80', fontWeight: 700 }}>
                      {currency === 'USD' ? '$' : 'Bs '}{amountInMethodCurrency.toFixed(2)}
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>
      
      {/* Actions */}
      <DialogActions sx={{ 
        p: 2, 
        backgroundColor: '#0f172a',
        borderTop: '1px solid rgba(255,255,255,0.1)'
      }}>
        <Button 
          onClick={onClose}
          sx={{ color: '#94a3b8' }}
        >
          Cancelar
        </Button>
        <Button 
          onClick={handleConfirm}
          variant="contained"
          disabled={!canConfirm}
          sx={{
            backgroundColor: '#4ade80',
            color: '#000',
            fontWeight: 600,
            '&:hover': {
              backgroundColor: '#22c55e'
            },
            '&:disabled': {
              backgroundColor: '#334155',
              color: '#64748b'
            }
          }}
        >
          Confirmar Pago
        </Button>
      </DialogActions>
    </Dialog>
  );
};
