import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import {
  getPaymentConfigs,
  updatePaymentConfig,
  getStaffPhones,
  createStaffPhone,
  deleteStaffPhone,
  updateGlobalSettings,
} from '../services/api';
import {
  Paper,
  Typography,
  Select,
  MenuItem,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Tabs,
  Tab,
  IconButton,
  Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import toast from 'react-hot-toast';

export const AdminConfigPage: React.FC = () => {
  const { paymentMethods, fetchPaymentMethods, globalSettings, fetchGlobalSettings } = useAppStore();

  const [tab, setTab] = useState(0);
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [responsable, setResponsable] = useState('');
  const [comision, setComision] = useState<string>('0');

  const [rechargeCommission, setRechargeCommission] = useState('10');
  const [staffPhones, setStaffPhones] = useState<any[]>([]);
  const [newPhone, setNewPhone] = useState('');
  const [newOwner, setNewOwner] = useState('');

  const loadData = async () => {
    try {
      if (!paymentMethods || paymentMethods.length === 0) {
        await fetchPaymentMethods();
      }
      await fetchGlobalSettings();
      const [configRes, phonesRes] = await Promise.all([
        getPaymentConfigs(),
        getStaffPhones(),
      ]);
      setConfigs(configRes.data || []);
      setStaffPhones(Array.isArray(phonesRes.data) ? phonesRes.data : []);
    } catch {
      toast.error('Error al cargar configuraciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (globalSettings?.recharge_commission_percent != null) {
      setRechargeCommission(String(globalSettings.recharge_commission_percent));
    }
  }, [globalSettings]);

  const handleSelectMethod = (methodId: string) => {
    setSelectedMethodId(methodId);
    const idNum = Number(methodId);
    const config = configs.find((c) => c.payment_method_id === idNum);
    if (config) {
      setResponsable(config.username || '');
      setComision(String(config.commission_percentage ?? 0));
    } else {
      setResponsable('');
      setComision('0');
    }
  };

  const handleSubmitGie = async () => {
    if (!selectedMethodId || !responsable) {
      toast.error('Debe seleccionar un método y un responsable.');
      return;
    }
    setLoading(true);
    try {
      await updatePaymentConfig({
        payment_method_id: Number(selectedMethodId),
        username: responsable,
        commission_percentage: Number(comision),
      });
      toast.success('Configuración guardada');
      await loadData();
    } catch {
      toast.error('Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRechargeCommission = async () => {
    setLoading(true);
    try {
      await updateGlobalSettings({
        recharge_commission_percent: Number(rechargeCommission),
      });
      toast.success('Comisión de recargas actualizada');
      await fetchGlobalSettings();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaffPhone = async () => {
    if (!newPhone || !newOwner) {
      toast.error('Teléfono y nombre son obligatorios');
      return;
    }
    try {
      await createStaffPhone({ phone_number: newPhone, owner_name: newOwner });
      toast.success('Teléfono agregado');
      setNewPhone('');
      setNewOwner('');
      const phonesRes = await getStaffPhones();
      setStaffPhones(Array.isArray(phonesRes.data) ? phonesRes.data : []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al agregar');
    }
  };

  const handleDeleteStaffPhone = async (id: number) => {
    try {
      await deleteStaffPhone(id);
      toast.success('Teléfono eliminado');
      const phonesRes = await getStaffPhones();
      setStaffPhones(Array.isArray(phonesRes.data) ? phonesRes.data : []);
    } catch {
      toast.error('Error al eliminar');
    }
  };

  if (loading && configs.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Responsables GIE" />
        <Tab label="Recargas" />
      </Tabs>

      {tab === 0 && (
        <Paper sx={{ p: 3, backgroundColor: '#1e293b', border: '1px solid #334155' }}>
          <Typography variant="h5" gutterBottom>
            Configurar Responsables (GIE-APP)
          </Typography>
          <Typography variant="body2" gutterBottom color="text.secondary">
            Asigne un responsable GIE-APP a cada método de pago para el cierre de caja.
          </Typography>

          <Box component="form" sx={{ mt: 3 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Método de Pago</InputLabel>
              <Select
                value={selectedMethodId}
                label="Método de Pago"
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
              label="Responsable (Username GIE-APP)"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              disabled={!selectedMethodId}
            />

            <TextField
              label="Comisión Bancaria (%)"
              type="number"
              value={comision}
              onChange={(e) => setComision(e.target.value)}
              fullWidth
              sx={{ mb: 3 }}
              disabled={!selectedMethodId}
            />

            <Button variant="contained" onClick={handleSubmitGie} disabled={loading || !selectedMethodId}>
              Guardar Configuración
            </Button>
          </Box>

          <Typography variant="h6" sx={{ mt: 4 }}>
            Configuraciones Actuales
          </Typography>
          <List>
            {configs.map((c) => (
              <ListItem key={c.id}>
                <ListItemText
                  primary={c.PaymentMethod?.name || 'Desconocido'}
                  secondary={`Responsable: ${c.username || '-'} | Comisión: ${c.commission_percentage ?? 0}%`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {tab === 1 && (
        <Paper sx={{ p: 3, backgroundColor: '#1e293b', border: '1px solid #334155' }}>
          <Typography variant="h5" gutterBottom>
            Configuración de Recargas
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', mb: 4 }}>
            <TextField
              label="Comisión de Recarga (%)"
              type="number"
              value={rechargeCommission}
              onChange={(e) => setRechargeCommission(e.target.value)}
              inputProps={{ min: 0, max: 100, step: 0.01 }}
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveRechargeCommission}
              disabled={loading}
            >
              Guardar
            </Button>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Typography variant="h6" gutterBottom>
            Teléfonos del Personal
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Teléfono"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              sx={{ flex: '1 1 200px' }}
            />
            <TextField
              label="Nombre"
              value={newOwner}
              onChange={(e) => setNewOwner(e.target.value)}
              sx={{ flex: '1 1 200px' }}
            />
            <Button variant="outlined" onClick={handleAddStaffPhone}>
              Agregar
            </Button>
          </Box>

          <List>
            {staffPhones.length === 0 ? (
              <Typography color="text.secondary">No hay teléfonos registrados</Typography>
            ) : (
              staffPhones.map((p) => (
                <ListItem
                  key={p.id}
                  secondaryAction={
                    <IconButton edge="end" onClick={() => handleDeleteStaffPhone(p.id)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemText primary={p.owner_name} secondary={p.phone_number} />
                </ListItem>
              ))
            )}
          </List>
        </Paper>
      )}
    </Box>
  );
};
