import type { ReactNode } from 'react';
import {
  Box,
  Paper,
  Divider,
  IconButton,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CloseIcon from '@mui/icons-material/Close';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import GavelIcon from '@mui/icons-material/Gavel';
import SyncIcon from '@mui/icons-material/Sync';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import GroupIcon from '@mui/icons-material/Group';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserProfileSection } from './UserProfileSection';
import { SessionMetricsSummary } from './SessionMetricsSummary';
import { useAppStore } from '../../store';

interface SidebarProps {
  summary: any;
  onCloseSession?: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  adminOnly: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <DashboardIcon />, adminOnly: false },
  { label: 'Recargas', path: '/recharges', icon: <PhoneAndroidIcon />, adminOnly: false },
  { label: 'Ver Sesiones', path: '/admin/sessions', icon: <HistoryIcon />, adminOnly: true },
  { label: 'Configurar Pagos', path: '/admin/config', icon: <SettingsIcon />, adminOnly: true },
  { label: 'Reglas de Negocio', path: '/admin/business-rules', icon: <GavelIcon />, adminOnly: true },
  { label: 'Sincronizar', path: '/admin/sync', icon: <SyncIcon />, adminOnly: true },
  { label: 'Usuarios', path: '/admin/users', icon: <GroupIcon />, adminOnly: true },
];

export const Sidebar = ({ summary, onCloseSession, isMobile = false, onClose }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppStore(state => state.user);
  const currentSession = useAppStore(state => state.currentSession);

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile && onClose) onClose();
  };

  return (
    <Box
      component={isMobile ? 'div' : Paper}
      elevation={isMobile ? 0 : 3}
      sx={{
        width: '320px',
        minHeight: '100vh',
        height: isMobile ? 'auto' : '100vh',
        backgroundColor: '#1e293b',
        color: '#ffffff',
        padding: 3,
        borderRadius: 0,
        position: isMobile ? 'relative' : 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {isMobile && onClose && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Menú
          </Typography>
          <IconButton
            onClick={onClose}
            sx={{
              color: '#ffffff',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      )}

      <UserProfileSection />

      <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

      <Typography
        variant="overline"
        sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 'bold', px: 1 }}
      >
        Navegación
      </Typography>
      <List dense sx={{ mb: 1 }}>
        {NAV_ITEMS.map(item => {
          if (item.adminOnly && user?.role !== 'admin') return null;

          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

          return (
            <ListItemButton
              key={item.path}
              selected={isActive}
              onClick={() => handleNavigate(item.path)}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                '&.Mui-selected': {
                  backgroundColor: 'rgba(96, 165, 250, 0.15)',
                  '&:hover': { backgroundColor: 'rgba(96, 165, 250, 0.2)' },
                },
              }}
            >
              <ListItemIcon sx={{ color: isActive ? 'primary.main' : 'rgba(255,255,255,0.7)', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 600 : 400,
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

      <Accordion
        defaultExpanded={false}
        elevation={0}
        disableGutters
        sx={{
          backgroundColor: '#1e293b',
          color: '#ffffff',
          '&:before': { display: 'none' },
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px !important',
          overflow: 'hidden',
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.7)' }} />}
          sx={{
            minHeight: 48,
            '& .MuiAccordionSummary-content': { my: 1 },
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            📊 Métricas de Sesión
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0, px: 1, pb: 1 }}>
          <SessionMetricsSummary summary={summary} compact />
        </AccordionDetails>
      </Accordion>

      {currentSession && onCloseSession && (
        <Box sx={{ mt: 'auto', pt: 3 }}>
          <Button
            variant="contained"
            color="error"
            fullWidth
            size="large"
            startIcon={<LockOutlinedIcon />}
            onClick={onCloseSession}
            sx={{
              py: 1.25,
              fontWeight: 700,
              boxShadow: 'none',
              '&:hover': { boxShadow: '0 4px 12px rgba(239,68,68,0.35)' },
            }}
          >
            Cerrar Caja
          </Button>
        </Box>
      )}
    </Box>
  );
};
