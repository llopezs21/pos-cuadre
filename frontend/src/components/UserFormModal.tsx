import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  CircularProgress,
} from '@mui/material';
import { createUser, updateUser } from '../services/api';
import toast from 'react-hot-toast';

export interface UserRecord {
  id: number;
  username: string;
  role: 'admin' | 'cashier';
  is_active: boolean;
  gie_app_username?: string | null;
}

interface UserFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  user?: UserRecord | null;
}

export const UserFormModal = ({ open, onClose, onSaved, user }: UserFormModalProps) => {
  const isEdit = Boolean(user);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'cashier'>('cashier');
  const [isActive, setIsActive] = useState(true);
  const [gieAppUsername, setGieAppUsername] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setUsername(user?.username ?? '');
      setPassword('');
      setRole(user?.role === 'admin' ? 'admin' : 'cashier');
      setIsActive(user?.is_active ?? true);
      setGieAppUsername(user?.gie_app_username ?? '');
    }
  }, [open, user]);

  const handleSubmit = async () => {
    if (!username.trim()) {
      toast.error('El nombre de usuario es obligatorio');
      return;
    }
    if (!isEdit && !password) {
      toast.error('La contraseña es obligatoria al crear');
      return;
    }

    setSaving(true);
    try {
      if (isEdit && user) {
        const payload: Record<string, unknown> = {
          username: username.trim(),
          role,
          is_active: isActive,
          gie_app_username: gieAppUsername.trim() || null,
        };
        if (password) payload.password = password;
        await updateUser(user.id, payload);
        toast.success('Usuario actualizado');
      } else {
        await createUser({
          username: username.trim(),
          password,
          role,
          is_active: isActive,
          gie_app_username: gieAppUsername.trim() || null,
        });
        toast.success('Usuario creado');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al guardar usuario';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { backgroundColor: '#1e293b', border: '1px solid #334155' },
      }}
    >
      <DialogTitle>{isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
            autoFocus
          />
          <TextField
            label={isEdit ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required={!isEdit}
          />
          <TextField
            label="Usuario GIE-APP (Responsable)"
            value={gieAppUsername}
            onChange={(e) => setGieAppUsername(e.target.value)}
            placeholder="Ej: gie_admin"
            fullWidth
            helperText="Requerido para cerrar caja y sincronizar con GIE-APP"
          />
          <FormControl fullWidth>
            <InputLabel>Rol</InputLabel>
            <Select value={role} label="Rol" onChange={(e) => setRole(e.target.value as 'admin' | 'cashier')}>
              <MenuItem value="cashier">Cajero</MenuItem>
              <MenuItem value="admin">Administrador</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} color="success" />}
            label="Activo"
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? <CircularProgress size={22} color="inherit" /> : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
