import { useState, useEffect, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  IconButton,
  AppBar,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { Sidebar } from '../components/sidebar/Sidebar';
import { CloseSessionModal } from '../components/CloseSessionModal';
import { useAppStore } from '../store';
import { getTransactionsBySessionId, getRechargesBySessionId } from '../services/api';
import { calculateSummaryFromTransactions, mergeRechargesIntoSummary } from '../utils/sessionSummary';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/admin/sessions': 'Historial de Sesiones',
  '/admin/config': 'Configurar Pagos',
  '/admin/business-rules': 'Reglas de Negocio',
  '/admin/sync': 'Sincronizar',
  '/admin/users': 'Usuarios',
  '/recharges': 'Recargas de Saldo',
};

export const MainLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();

  const currentSession = useAppStore(state => state.currentSession);
  const getCurrentSession = useAppStore(state => state.getCurrentSession);
  const bcvRate = useAppStore(state => state.bcvRate);
  const fetchBcvRate = useAppStore(state => state.fetchBcvRate);
  const fetchPaymentMethods = useAppStore(state => state.fetchPaymentMethods);
  const fetchCurrentUser = useAppStore(state => state.fetchCurrentUser);

  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [sidebarSummary, setSidebarSummary] = useState<any | null>(null);
  const [isCloseModalOpen, setCloseModalOpen] = useState(false);

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'POS Cuadre';

  useEffect(() => {
    fetchCurrentUser();
    if (!currentSession) getCurrentSession();
    fetchBcvRate();
    fetchPaymentMethods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    if (!currentSession?.id) {
      setSidebarSummary(null);
      return;
    }

    const loadSidebarSummary = async () => {
      try {
        const [txResp, rechargeResp] = await Promise.all([
          getTransactionsBySessionId(currentSession.id),
          getRechargesBySessionId(currentSession.id),
        ]);
        const txs = Array.isArray(txResp.data) ? txResp.data : [];
        const recharges = Array.isArray(rechargeResp.data) ? rechargeResp.data : [];
        const base = calculateSummaryFromTransactions(txs);
        setSidebarSummary(mergeRechargesIntoSummary(base, recharges));
      } catch {
        setSidebarSummary(null);
      }
    };

    loadSidebarSummary();

    const handleRefresh = () => loadSidebarSummary();
    window.addEventListener('transactionAdded', handleRefresh);
    window.addEventListener('rechargeAdded', handleRefresh);
    return () => {
      window.removeEventListener('transactionAdded', handleRefresh);
      window.removeEventListener('rechargeAdded', handleRefresh);
    };
  }, [currentSession?.id]);

  const sidebarProps = useMemo(
    () => ({
      summary: sidebarSummary,
      onCloseSession: () => setCloseModalOpen(true),
      isMobile,
      onClose: () => setSidebarOpen(false),
    }),
    [sidebarSummary, isMobile]
  );

  return (
    <>
      <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a' }}>
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': {
                width: 320,
                boxSizing: 'border-box',
                backgroundColor: '#1e293b',
              },
            }}
          >
            <Sidebar {...sidebarProps} />
          </Drawer>
        ) : (
          sidebarOpen && (
            <Box sx={{ width: 320, flexShrink: 0 }}>
              <Sidebar {...sidebarProps} isMobile={false} />
            </Box>
          )
        )}

        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <AppBar
            position="static"
            color="transparent"
            elevation={0}
            sx={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}
          >
            <Toolbar sx={{ gap: 1 }}>
              <IconButton
                color="inherit"
                aria-label="toggle sidebar"
                edge="start"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                sx={{ mr: 1 }}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" noWrap>
                {pageTitle}
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  backgroundColor: 'rgba(74,222,128,0.1)',
                  border: '1px solid rgba(74,222,128,0.2)',
                  flexShrink: 0,
                }}
              >
                <TrendingUpIcon fontSize="small" sx={{ color: '#4ade80' }} />
                <Typography
                  variant="body2"
                  sx={{ color: '#4ade80', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  BCV: {bcvRate != null ? bcvRate.toFixed(2) : '—'} Bs/$
                </Typography>
              </Box>
            </Toolbar>
          </AppBar>

          <Box
            component="main"
            sx={{
              flexGrow: 1,
              overflow: 'auto',
              p: { xs: 2, sm: 3, md: 4 },
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>

      <CloseSessionModal
        open={isCloseModalOpen}
        onClose={() => setCloseModalOpen(false)}
        summary={sidebarSummary}
      />
    </>
  );
};
