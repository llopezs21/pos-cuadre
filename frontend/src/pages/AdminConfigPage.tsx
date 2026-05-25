import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { getPaymentConfigs, updatePaymentConfig } from '../services/api';
import {
  Container, Paper, Typography, Select, MenuItem, Button, TextField,
  FormControl, InputLabel, Box, CircularProgress, List, ListItem, ListItemText,
  AppBar, Toolbar, Stack
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export const AdminConfigPage: React.FC = () => {
  const navigate = useNavigate();
  const { paymentMethods, fetchPaymentMethods, user, logout } = useAppStore();

  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [responsable, setResponsable] = useState('');
  const [comision, setComision] = useState<string>('0');

  const loadData = async () => {
    try {
      if (!paymentMethods || paymentMethods.length === 0) {
        await fetchPaymentMethods();
      }
      const configRes = await getPaymentConfigs();
      setConfigs(configRes.data || []);
    } catch (err) {
      toast.error('Error al cargar configuraciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line
  }, []);

  const handleSelectMethod = (methodId: string) => {
    setSelectedMethodId(methodId);
    const idNum = Number(methodId);
    const config = configs.find(c => c.payment_method_id === idNum);
    if (config) {
      setResponsable(config.username || '');
      setComision(String(config.commission_percentage ?? 0));
    } else {
      setResponsable('');
      setComision('0');
    }
  };

  const handleSubmit = async () => {
    if (!selectedMethodId || !responsable) {
      toast.error('Debe seleccionar un método y un responsable.');
      return;
    }
    setLoading(true);
    try {
      await updatePaymentConfig({
        payment_method_id: Number(selectedMethodId),
        username: responsable,
        commission_percentage: Number(comision)
      });
      toast.success('Configuración guardada');
      await loadData();
    } catch (err) {
      toast.error('Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  if (loading && configs.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;

  return (
    <>
      {/* Barra superior consistente con Dashboard */}
      <AppBar position="static" color="transparent" elevation={0} sx={{ mb: 2 }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">Admin - Configuración</Typography>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              Usuario: {user?.username || 'Cargando...'}
            </Typography>
          </Stack>
          <Box>
            <Button component={RouterLink} to="/" color="inherit" sx={{ mr: 1 }}>Dashboard</Button>
            <Button component={RouterLink} to="/admin/sessions" color="inherit" sx={{ mr: 1 }}>Ver Sesiones</Button>
            <Button component={RouterLink} to="/admin/sync" color="inherit" sx={{ mr: 1 }}>Sincronizar</Button>
            <Button component={RouterLink} to="/admin/config" color="inherit" sx={{ mr: 2 }}>Configurar Pagos</Button>
            <Button color="inherit" onClick={() => { logout(); navigate('/login'); }}>Cerrar Sesión</Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md">
        <Paper sx={{ p: 3, mt: 1 }}>
          <Typography variant="h4" gutterBottom>
            Configurar Responsables (GIE-APP)
          </Typography>
          <Typography variant="body2" gutterBottom>
            Asigne un "Responsable" (cuenta de GIE-APP) a cada método de pago para el cierre de caja.
          </Typography>

          <Box component="form" sx={{ mt: 3 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>1. Seleccionar Método de Pago</InputLabel>
              <Select
                value={selectedMethodId}
                label="1. Seleccionar Método de Pago"
                onChange={(e) => handleSelectMethod(String(e.target.value))}
              >
                {(paymentMethods || []).map((m: any) => (
                  <MenuItem key={m.id} value={String(m.id)}>
                    {m.name} ({m.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="2. Nombre del Responsable (Username GIE-APP)"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              disabled={!selectedMethodId}
              placeholder="Ej: admin_pm, marconis, etc."
            />

            <TextField
              label="3. Porcentaje de Comisión (%)"
              type="number"
              value={comision}
              onChange={(e) => setComision(e.target.value)}
              fullWidth
              sx={{ mb: 3 }}
              disabled={!selectedMethodId}
              placeholder="Ej: 2.5"
            />

            <Button variant="contained" onClick={handleSubmit} disabled={loading || !selectedMethodId}>
              {loading ? <CircularProgress size={24} /> : 'Guardar Configuración'}
            </Button>
          </Box>

          <Typography variant="h6" sx={{ mt: 4 }}>Configuraciones Actuales</Typography>
          <List>
            {configs.map(c => (
              <ListItem key={c.id}>
                <ListItemText
                  primary={c.PaymentMethod?.name || 'Desconocido'}
                  secondary={`Responsable: ${c.username || '-'} | Comisión: ${c.commission_percentage ?? 0}%`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Container>
    </>
  );
};
