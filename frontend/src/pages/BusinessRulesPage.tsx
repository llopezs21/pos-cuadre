import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  CircularProgress,
  AppBar,
  Toolbar,
  IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export const BusinessRulesPage = () => {
  const navigate = useNavigate();
  
  // Store
  const globalSettings = useAppStore(state => state.globalSettings);
  const fetchGlobalSettings = useAppStore(state => state.fetchGlobalSettings);
  const paymentMethods = useAppStore(state => state.paymentMethods);
  const fetchPaymentMethods = useAppStore(state => state.fetchPaymentMethods);

  // Estado local para edición de configuración global
  const [ivaRate, setIvaRate] = useState<string>('');
  const [ivaThreshold, setIvaThreshold] = useState<string>('');
  const [tolerance, setTolerance] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Estado local para edición de métodos de pago
  const [methodsState, setMethodsState] = useState<any[]>([]);

  // Cargar datos al montar
  useEffect(() => {
    fetchGlobalSettings();
    fetchPaymentMethods();
  }, [fetchGlobalSettings, fetchPaymentMethods]);

  // Sincronizar estado local con store cuando cambien
  useEffect(() => {
    if (globalSettings) {
      setIvaRate((globalSettings.iva_rate * 100).toFixed(2)); // Convertir 0.16 a 16.00
      setIvaThreshold((globalSettings.iva_threshold * 100).toFixed(2)); // Convertir 0.5 a 50.00
      setTolerance(globalSettings.reconciliation_tolerance.toFixed(2));
    }
  }, [globalSettings]);

  useEffect(() => {
    if (paymentMethods.length > 0) {
      setMethodsState(paymentMethods);
    }
  }, [paymentMethods]);

  // === SECCIÓN A: Guardar configuración global ===
  const handleSaveGlobalSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('No hay sesión activa');
        return;
      }

      // Convertir porcentajes a decimales
      const payload = {
        iva_rate: Number(ivaRate) / 100, // 16.00 -> 0.16
        iva_threshold: Number(ivaThreshold) / 100, // 50.00 -> 0.5
        reconciliation_tolerance: Number(tolerance)
      };

      const response = await fetch('http://localhost:4000/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al actualizar');
      }

      toast.success('Configuración global actualizada exitosamente');
      await fetchGlobalSettings(); // Refrescar desde el backend
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  // === SECCIÓN B: Alternar flags de métodos de pago ===
  const handleToggleMethod = async (methodId: number, field: 'triggers_iva' | 'is_base_currency', currentValue: boolean) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('No hay sesión activa');
        return;
      }

      const payload = {
        [field]: !currentValue
      };

      const response = await fetch(`http://localhost:4000/api/payment-methods/${methodId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Error al actualizar método de pago');
      }

      toast.success('Método de pago actualizado');
      
      // Actualizar estado local inmediatamente
      setMethodsState(prev =>
        prev.map(m =>
          m.id === methodId ? { ...m, [field]: !currentValue } : m
        )
      );

      // Refrescar desde el backend
      await fetchPaymentMethods();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar método');
    }
  };

  if (!globalSettings) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate('/')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
            Reglas de Negocio
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          Esta configuración controla el comportamiento matemático del sistema de cuadre.
          Los cambios se aplican inmediatamente a todos los cálculos.
        </Alert>

        {/* ========== SECCIÓN A: Parámetros Globales ========== */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 2, fontWeight: 'bold' }}>
            📊 Parámetros Globales
          </Typography>
          
          <Box display="flex" flexDirection="column" gap={3}>
            <TextField
              label="Tasa de IVA (%)"
              type="number"
              value={ivaRate}
              onChange={(e) => setIvaRate(e.target.value)}
              helperText="Ejemplo: 16 para 16%"
              inputProps={{ step: 0.01, min: 0, max: 100 }}
              fullWidth
            />

            <TextField
              label="Umbral de Exoneración de IVA (%)"
              type="number"
              value={ivaThreshold}
              onChange={(e) => setIvaThreshold(e.target.value)}
              helperText="Si el pago en moneda base supera este %, NO se aplica IVA. Ejemplo: 50 para 50%"
              inputProps={{ step: 0.01, min: 0, max: 100 }}
              fullWidth
            />

            <TextField
              label="Tolerancia de Cuadre (USD)"
              type="number"
              value={tolerance}
              onChange={(e) => setTolerance(e.target.value)}
              helperText="Diferencia máxima aceptable en el cuadre. Ejemplo: 0.05 para 5 centavos"
              inputProps={{ step: 0.01, min: 0 }}
              fullWidth
            />

            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<SaveIcon />}
              onClick={handleSaveGlobalSettings}
              disabled={loading}
              sx={{ alignSelf: 'flex-start' }}
            >
              {loading ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </Box>
        </Paper>

        <Divider sx={{ my: 4 }} />

        {/* ========== SECCIÓN B: Comportamiento de Métodos ========== */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 2, fontWeight: 'bold' }}>
            💳 Comportamiento de Métodos de Pago
          </Typography>

          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Triggers IVA:</strong> Si está activo, los pagos con este método disparan la aplicación de IVA cuando se supera el umbral.
            <br />
            <strong>Moneda Base:</strong> Si está activo, este método se considera para calcular si se alcanza el umbral de exoneración.
          </Alert>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Método</strong></TableCell>
                  <TableCell><strong>Código</strong></TableCell>
                  <TableCell><strong>Moneda</strong></TableCell>
                  <TableCell align="center"><strong>Triggers IVA</strong></TableCell>
                  <TableCell align="center"><strong>Moneda Base</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {methodsState.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="text.secondary">
                        No hay métodos de pago configurados
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  methodsState.map((method) => (
                    <TableRow key={method.id}>
                      <TableCell>{method.name}</TableCell>
                      <TableCell>
                        <code style={{ 
                          backgroundColor: '#f5f5f5', 
                          padding: '4px 8px', 
                          borderRadius: '4px',
                          fontSize: '0.85em'
                        }}>
                          {method.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: 'inline-block',
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1,
                            backgroundColor: method.currency === 'USD' ? '#e3f2fd' : '#fff3e0',
                            color: method.currency === 'USD' ? '#1976d2' : '#f57c00',
                            fontWeight: 'bold',
                            fontSize: '0.85em'
                          }}
                        >
                          {method.currency}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <FormControlLabel
                          control={
                            <Switch
                              checked={!!method.triggers_iva}
                              onChange={() =>
                                handleToggleMethod(method.id, 'triggers_iva', !!method.triggers_iva)
                              }
                              color="primary"
                            />
                          }
                          label=""
                        />
                      </TableCell>
                      <TableCell align="center">
                        <FormControlLabel
                          control={
                            <Switch
                              checked={!!method.is_base_currency}
                              onChange={() =>
                                handleToggleMethod(method.id, 'is_base_currency', !!method.is_base_currency)
                              }
                              color="secondary"
                            />
                          }
                          label=""
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Container>
    </>
  );
};
