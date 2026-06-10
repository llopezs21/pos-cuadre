import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store';
import { TransactionForm } from '../components/TransactionForm';
import { SummaryView } from '../components/SummaryView';
import { TransactionsTable } from '../components/TransactionsTable';
import { StartSession } from '../components/StartSession';
import {
  Paper,
  Stack,
  Typography,
  Toolbar,
  Button,
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getAllSessions, getTransactionsBySessionId, getRechargesBySessionId } from '../services/api';
import { calculateSummaryFromTransactions, mergeRechargesIntoSummary } from '../utils/sessionSummary';

export const DashboardPage = () => {
  const user = useAppStore(state => state.user);
  const currentSession = useAppStore(state => state.currentSession);
  const getCurrentSession = useAppStore(state => state.getCurrentSession);
  const fetchGlobalSettings = useAppStore(state => state.fetchGlobalSettings);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [adminSessionList, setAdminSessionList] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [page, setPage] = useState<'dashboard' | 'transactions'>('dashboard');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchGlobalSettings();
    if (!currentSession) getCurrentSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      getAllSessions()
        .then(response => {
          const list = Array.isArray(response.data) ? response.data : [];
          const active = currentSession ? [{ ...currentSession, username: user.username }, ...list] : list;
          setAdminSessionList(active);

          const currentSelectionValid = active.some((s: any) => String(s.id) === selectedSessionId);
          if ((!selectedSessionId || !currentSelectionValid) && active.length > 0) {
            setSelectedSessionId(String(active[0].id));
          }
        })
        .catch(err => {
          console.error('Error fetching session list', err);
          setAdminSessionList([]);
        });
    }
  }, [user, currentSession]);

  useEffect(() => {
    if (user?.role !== 'admin' && currentSession?.id) {
      setSelectedSessionId(prev => prev || String(currentSession.id));
    }
  }, [currentSession, selectedSessionId, user]);

  useEffect(() => {
    if (!selectedSessionId) {
      setTransactions([]);
      setSummary(null);
      return;
    }

    const loadTransactions = async () => {
      setLoading(true);
      try {
        const sessionId = Number(selectedSessionId);
        const [txResp, rechargeResp] = await Promise.all([
          getTransactionsBySessionId(sessionId),
          getRechargesBySessionId(sessionId),
        ]);
        const txs = Array.isArray(txResp.data) ? txResp.data : [];
        const recharges = Array.isArray(rechargeResp.data) ? rechargeResp.data : [];
        setTransactions(txs);
        setSummary(mergeRechargesIntoSummary(calculateSummaryFromTransactions(txs), recharges));
      } catch (err) {
        console.error(`Error fetching data for session ${selectedSessionId}`, err);
        setTransactions([]);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();

    const handleRefresh = () => loadTransactions();
    window.addEventListener('transactionAdded', handleRefresh);
    window.addEventListener('rechargeAdded', handleRefresh);
    return () => {
      window.removeEventListener('transactionAdded', handleRefresh);
      window.removeEventListener('rechargeAdded', handleRefresh);
    };
  }, [selectedSessionId]);

  useEffect(() => {
    if (!user) navigate('/login', { replace: true });
  }, [user, navigate]);

  const filteredTransactions = useMemo(() => {
    if (paymentMethodFilter === 'all') return transactions;
    return transactions.filter(tx =>
      (tx.payments || []).some((p: any) => {
        const method = (p.payment_method_code || p.method || '').toString().toUpperCase();
        return method === paymentMethodFilter.toUpperCase();
      })
    );
  }, [transactions, paymentMethodFilter]);

  const filteredTotals = useMemo(() => {
    const totals = { usd: 0, ves: 0, banesco: 0, mibanco: 0 };
    for (const tx of filteredTransactions) {
      for (const payment of tx.payments || []) {
        const code = ((payment as any).payment_method_code || payment.method || '').toString().toUpperCase();
        switch (code) {
          case 'CASH_USD': totals.usd += Number(payment.amount || 0); break;
          case 'CASH_VES': totals.ves += Number(payment.amount || 0); break;
          case 'POS_BANESCO': totals.banesco += Number(payment.amount || 0); break;
          case 'POS_MIBANCO': totals.mibanco += Number(payment.amount || 0); break;
        }
      }
    }
    return totals;
  }, [filteredTransactions]);

  return (
    <Box sx={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {selectedSessionId && (
        <Typography
          variant="body2"
          sx={{
            color: 'secondary.light',
            fontWeight: 600,
            border: '1px solid',
            borderColor: 'secondary.dark',
            px: 1,
            py: 0.5,
            borderRadius: 1,
            display: 'inline-block',
            mb: 2,
          }}
        >
          Viendo Sesión: #{selectedSessionId}
        </Typography>
      )}

      {user?.role === 'admin' && (
        <Paper sx={{ p: 2, mb: 3, backgroundColor: '#1e293b', border: '1px solid #334155' }}>
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
                      {s.username || 'Usuario'} (Sesión #{s.id}) -{' '}
                      {new Date(s.closedAt || s.createdAt || Date.now()).toLocaleString()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ flex: '1 1 100%', maxWidth: { md: '50%' }, display: 'flex', alignItems: 'center' }}>
              {loading ? (
                <CircularProgress size={24} />
              ) : (
                <Typography>Sesión seleccionada: #{selectedSessionId || '—'}</Typography>
              )}
            </Box>
          </Box>
        </Paper>
      )}

      <Paper
        elevation={0}
        sx={{ mb: 3, backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 1 }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <Button
            color={page === 'dashboard' ? 'primary' : 'inherit'}
            onClick={() => setPage('dashboard')}
          >
            Resumen y Registro
          </Button>
          <Button
            color={page === 'transactions' ? 'primary' : 'inherit'}
            onClick={() => setPage('transactions')}
          >
            Ver Transacciones
          </Button>
        </Toolbar>
      </Paper>

      {page === 'dashboard' && (
        <Stack spacing={3}>
          {currentSession ? (
            <Paper sx={{ p: 3, backgroundColor: '#1e293b', border: '1px solid #334155' }}>
              <TransactionForm />
            </Paper>
          ) : (
            <Paper sx={{ p: 4, backgroundColor: '#1e293b', border: '1px solid #334155' }}>
              <StartSession embedded />
            </Paper>
          )}

          {loading && <Typography>Cargando...</Typography>}

          {!loading && summary && (
            <Paper sx={{ p: 3, backgroundColor: '#1e293b', border: '1px solid #334155' }}>
              <SummaryView summary={summary} />
            </Paper>
          )}
        </Stack>
      )}

      {page === 'transactions' && (
        <Stack spacing={3}>
          <Paper sx={{ p: 2, backgroundColor: '#1e293b', border: '1px solid #334155' }}>
            <Typography variant="h6" gutterBottom>
              Filtrar por Método de Pago
            </Typography>
            <ToggleButtonGroup
              value={paymentMethodFilter}
              exclusive
              onChange={(_, v) => v && setPaymentMethodFilter(v)}
              sx={{ mb: 2 }}
            >
              <ToggleButton value="all">Todos</ToggleButton>
              <ToggleButton value="CASH_USD">Efectivo USD</ToggleButton>
              <ToggleButton value="CASH_VES">Efectivo VES</ToggleButton>
              <ToggleButton value="POS_BANESCO">Punto Banesco</ToggleButton>
              <ToggleButton value="POS_MIBANCO">Punto Mi Banco</ToggleButton>
            </ToggleButtonGroup>

            <Box
              sx={{
                display: 'flex',
                gap: 4,
                flexWrap: 'wrap',
                mb: 2,
                p: 2,
                backgroundColor: 'action.hover',
                borderRadius: 1,
              }}
            >
              <Typography variant="body1">
                <strong>USD:</strong> ${filteredTotals.usd.toFixed(2)}
              </Typography>
              <Typography variant="body1">
                <strong>VES:</strong> {filteredTotals.ves.toFixed(2)}
              </Typography>
              <Typography variant="body1">
                <strong>Banesco:</strong> {filteredTotals.banesco.toFixed(2)}
              </Typography>
              <Typography variant="body1">
                <strong>MiBanco:</strong> {filteredTotals.mibanco.toFixed(2)}
              </Typography>
            </Box>

            <TransactionsTable transactions={filteredTransactions} />
          </Paper>
        </Stack>
      )}
    </Box>
  );
};
