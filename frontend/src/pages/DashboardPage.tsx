import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store';
import { TransactionForm } from '../components/TransactionForm';
import { SummaryView } from '../components/SummaryView';
import { TransactionsTable } from '../components/TransactionsTable';
import { StartSession } from '../components/StartSession';
import { CloseSessionModal } from '../components/CloseSessionModal';
import { Container, Paper, Stack, Typography, AppBar, Toolbar, Button, Box, ToggleButtonGroup, ToggleButton, Select, MenuItem, FormControl, InputLabel, CircularProgress } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { getAllSessions, getTransactionsBySessionId } from '../services/api';

export const DashboardPage = () => {
  // Store: usar selectores individuales para evitar re-render infinito
  const user = useAppStore(state => state.user);
  // Selector: usar únicamente currentSession para evitar ambigüedad
  const currentSession = useAppStore(state => state.currentSession);
  const getCurrentSession = useAppStore(state => state.getCurrentSession);
  const fetchBcvRate = useAppStore(state => state.fetchBcvRate);
  const fetchPaymentMethods = useAppStore(state => state.fetchPaymentMethods);
  const logout = useAppStore(state => state.logout);
  const isSessionOpen = useAppStore(state => state.isSessionOpen);

  // Estados locales
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Admin: lista de sesiones y sesión seleccionada
  const [adminSessionList, setAdminSessionList] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  const [page, setPage] = useState<'dashboard' | 'transactions'>('dashboard');
  const [isCloseModalOpen, setCloseModalOpen] = useState(false);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const navigate = useNavigate();

  // Cargar datos iniciales del store
  useEffect(() => {
    // Evitar llamadas redundantes: pedir current session solo si no está en el store
    if (!currentSession) getCurrentSession();
    fetchBcvRate();
    fetchPaymentMethods();
    // eslint-disable-next-line
  }, []);

  // HELPER: calcular resumen desde transacciones (frontend)
  const calculateSummaryFromTransactions = (txs: any[]) => {
    // 1. Usar las claves que SummaryView espera
    const totalsByMethod = {
      totalCashUSD: 0,
      totalCashVES: 0,
      totalPosBanesco: 0,
      totalPosMiBanco: 0,
    };
    let totalMikrowispUSD = 0;
    let totalSupportInstallationUSD = 0;

    txs.forEach(tx => {
      if (tx.invoiceType === 'service') {
        totalMikrowispUSD += Number(tx.invoiceBaseUSD) || 0;
      } else {
        totalSupportInstallationUSD += Number(tx.invoiceBaseUSD) || 0;
      }

      (tx.payments || []).forEach((p: any) => {
        const amount = Number(p.amount) || 0;
        const method = (p.payment_method_code || p.method || '').toString();

        // Mapear el código del pago a la clave correcta
        switch (method) {
          case 'cash_usd':
            totalsByMethod.totalCashUSD += amount;
            break;
          case 'cash_ves':
            totalsByMethod.totalCashVES += amount;
            break;
          case 'pos_banesco':
            totalsByMethod.totalPosBanesco += amount;
            break;
          case 'pos_mibanco':
            totalsByMethod.totalPosMiBanco += amount;
            break;
          default:
            break;
        }
      });
    });

    return {
      totalsByMethod,
      totalsByCategory: { totalMikrowispUSD, totalSupportInstallationUSD },
      differences: []
    };
  };

  // --- Admin: cargar lista de sesiones cerradas / disponibles ---
  useEffect(() => {
    if (user?.role === 'admin') {
      getAllSessions()
        .then(response => {
          const list = Array.isArray(response.data) ? response.data : [];
          const active = currentSession ? [{ ...currentSession, username: user.username }, ...list] : list;
          setAdminSessionList(active);

          // --- CORRECCIÓN RACE CONDITION ---
          // Si no hay nada seleccionado, o si la selección actual ya no existe,
          // seleccionar el primer item de la lista (sesión activa).
          const currentSelectionValid = active.some((s: any) => String(s.id) === selectedSessionId);
          if ((!selectedSessionId || !currentSelectionValid) && active.length > 0) {
            setSelectedSessionId(String(active[0].id));
          }
          // --- FIN CORRECCIÓN ---
        })
        .catch(err => {
          console.error('Error fetching session list', err);
          setAdminSessionList([]);
        });
    }
    // ejecutar solo cuando cambian user o la sesión actual
  }, [user, currentSession]);

  // --- Reemplazo: pre-seleccionar la sesión activa SOLO para usuarios no-admin ---
  useEffect(() => {
    // Si somos un usuario normal y tenemos sesión en el store, asegurar que la usamos
    if (user?.role !== 'admin' && currentSession?.id) {
      // Evitar sobreescribir una selección manual ya hecha
      setSelectedSessionId(prev => prev || String(currentSession.id));
    }
  }, [currentSession, selectedSessionId, user]);

  // Cargar transacciones y calcular resumen cuando cambie la sesión seleccionada
  useEffect(() => {
    if (!selectedSessionId) {
      setTransactions([]);
      setSummary(null);
      return;
    }

    setLoading(true);
    // CORRECCIÓN: selectedSessionId es string, la API espera number
    getTransactionsBySessionId(Number(selectedSessionId))
      .then(resp => {
        const txs = Array.isArray(resp.data) ? resp.data : [];
        setTransactions(txs);
        setSummary(calculateSummaryFromTransactions(txs));
      })
      .catch(err => {
        console.error(`Error fetching data for session ${selectedSessionId}`, err);
        setTransactions([]);
        setSummary(null);
      })
      .finally(() => setLoading(false));
  }, [selectedSessionId]);

  // Redirección si no hay usuario
  useEffect(() => {
    if (!user) navigate('/login', { replace: true });
  }, [user, navigate]);

  // Filtrado de transacciones por método
  const filteredTransactions = useMemo(() => {
    if (paymentMethodFilter === 'all') return transactions;
    return transactions.filter(tx => (tx.payments || []).some((p: any) => (p.payment_method_code || p.method) === paymentMethodFilter));
  }, [transactions, paymentMethodFilter]);

  const filteredTotals = useMemo(() => {
    const totals = { usd: 0, ves: 0, banesco: 0, mibanco: 0 };
    for (const tx of filteredTransactions) {
      for (const payment of tx.payments || []) {
        const code = payment.payment_method_code || payment.method;
        switch (code) {
          case 'cash_usd': totals.usd += Number(payment.amount || 0); break;
          case 'cash_ves': totals.ves += Number(payment.amount || 0); break;
          case 'pos_banesco': totals.banesco += Number(payment.amount || 0); break;
          case 'pos_mibanco': totals.mibanco += Number(payment.amount || 0); break;
        }
      }
    }
    return totals;
  }, [filteredTransactions]);

  // UI
  return (
    <>
      <AppBar position="static" color="transparent" elevation={0} sx={{ mb: 2 }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">Dashboard</Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              Usuario: {user?.username || 'Cargando...'}
            </Typography>

            {/* --- LÍNEA AÑADIDA: indicador de sesión seleccionada --- */}
            {selectedSessionId && (
              <Typography variant="body2" sx={{ color: 'secondary.light', fontWeight: 600, border: '1px solid', borderColor: 'secondary.dark', px: 1, borderRadius: 1 }}>
                Viendo Sesión: #{selectedSessionId}
              </Typography>
            )}
            {/* --- FIN DE LÍNEA AÑADIDA --- */}

          </Box>
          <Box>
            {user?.role === 'admin' && (
              <>
                <Button component={RouterLink} to="/admin/sessions" color="inherit" sx={{ mr: 2 }}>
                  Ver Sesiones
                </Button>
                <Button component={RouterLink} to="/admin/config" color="inherit" sx={{ mr: 2 }}>
                  Configurar Pagos
                </Button>
                <Button component={RouterLink} to="/admin/sync" color="inherit" sx={{ mr: 2 }}>
                  Sincronizar
                </Button>
              </>
            )}
            <Button color="secondary" variant="contained" onClick={() => setCloseModalOpen(true)} sx={{ mr: 2 }}>
              Cerrar Caja
            </Button>
            <Button color="inherit" onClick={logout}>Cerrar Sesión</Button>
          </Box>
        </Toolbar>
      </AppBar>

      {!isSessionOpen ? (
        <Container maxWidth="sm" sx={{ mt: 8 }}>
          <StartSession />
        </Container>
      ) : (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Typography variant="h3" component="h1" align="center" gutterBottom>
            Aplicación de Cuadre de Caja
          </Typography>

          {/* Admin: selector de sesión */}
          {user?.role === 'admin' && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 100%', maxWidth: { md: '50%' } }}>
                  <FormControl fullWidth>
                    <InputLabel>Ver Sesión de Usuario</InputLabel>
                    <Select
                      value={selectedSessionId || ''}
                      label="Ver Sesión de Usuario"
                      onChange={(e) => setSelectedSessionId(String(e.target.value))}
                    >
                      {adminSessionList.map((s: any) => (
                        <MenuItem key={s.id} value={String(s.id)}>
                          {s.username || 'Usuario'} (Sesión #{s.id}) - {new Date(s.closedAt || s.createdAt || Date.now()).toLocaleString()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ flex: '1 1 100%', maxWidth: { md: '50%' }, display: 'flex', alignItems: 'center' }}>
                  {loading ? <CircularProgress size={24} /> : <Typography>Sesión seleccionada: #{selectedSessionId || '—'}</Typography>}
                </Box>
              </Box>
            </Paper>
          )}

          <AppBar position="static" color="default" sx={{ mb: 3 }}>
            <Toolbar>
              <Button color={page === 'dashboard' ? 'primary' : 'inherit'} onClick={() => setPage('dashboard')}>
                Resumen y Registro
              </Button>
              <Button color={page === 'transactions' ? 'primary' : 'inherit'} onClick={() => setPage('transactions')}>
                Ver Transacciones
              </Button>
            </Toolbar>
          </AppBar>

          {page === 'dashboard' && (
            <Stack spacing={3}>
              <Paper sx={{ p: 3 }}>
                <TransactionForm />
              </Paper>

              {loading && <Typography>Cargando...</Typography>}

              {!loading && summary && (
                <Paper sx={{ p: 3 }}>
                  <SummaryView summary={summary} />
                </Paper>
              )}
            </Stack>
          )}

          {page === 'transactions' && (
            <Stack spacing={3}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Filtrar por Método de Pago</Typography>
                <ToggleButtonGroup value={paymentMethodFilter} exclusive onChange={(_, v) => v && setPaymentMethodFilter(v)} sx={{ mb: 2 }}>
                  <ToggleButton value="all">Todos</ToggleButton>
                  <ToggleButton value="cash_usd">Efectivo USD</ToggleButton>
                  <ToggleButton value="cash_ves">Efectivo VES</ToggleButton>
                  <ToggleButton value="pos_banesco">Punto Banesco</ToggleButton>
                  <ToggleButton value="pos_mibanco">Punto Mi Banco</ToggleButton>
                </ToggleButtonGroup>

                <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', mb: 2, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="body1"><strong>USD:</strong> ${filteredTotals.usd.toFixed(2)}</Typography>
                  <Typography variant="body1"><strong>VES:</strong> {filteredTotals.ves.toFixed(2)}</Typography>
                  <Typography variant="body1"><strong>Banesco:</strong> {filteredTotals.banesco.toFixed(2)}</Typography>
                  <Typography variant="body1"><strong>MiBanco:</strong> {filteredTotals.mibanco.toFixed(2)}</Typography>
                </Box>

                <TransactionsTable transactions={filteredTransactions} />
              </Paper>
            </Stack>
          )}
        </Container>
      )}

      <CloseSessionModal open={isCloseModalOpen} onClose={() => setCloseModalOpen(false)} summary={summary} />
    </>
  );
};