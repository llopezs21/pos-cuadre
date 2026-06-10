import { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  IconButton,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import { getUsers, deleteUser } from '../services/api';
import { UserFormModal, type UserRecord } from '../components/UserFormModal';
import toast from 'react-hot-toast';
import { useAppStore } from '../store';

const panelSx = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  boxShadow: 'none',
};

export const UsersPage = () => {
  const currentUser = useAppStore((s) => s.user);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers();
      const list = Array.isArray(res.data) ? res.data : [];
      setUsers(
        list.map((u: any) => ({
          id: u.id,
          username: u.username,
          role: u.role === 'admin' ? 'admin' : 'cashier',
          is_active: u.is_active !== false && u.is_active !== 0,
          gie_app_username: u.gie_app_username ?? null,
        }))
      );
    } catch {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDeactivate = async (user: UserRecord) => {
    if (user.id === currentUser?.id) {
      toast.error('No puedes desactivar tu propia cuenta');
      return;
    }
    if (!window.confirm(`¿Desactivar al usuario "${user.username}"?`)) return;

    try {
      await deleteUser(user.id);
      toast.success('Usuario desactivado');
      await loadUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al desactivar');
    }
  };

  const openCreate = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  const openEdit = (user: UserRecord) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  return (
    <Box sx={{ maxWidth: 1000, margin: '0 auto', width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={600}>
          Gestión de Usuarios
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Nuevo Usuario
        </Button>
      </Box>

      <Paper sx={{ ...panelSx, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Usuario GIE-APP</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary">No hay usuarios registrados</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell>{u.id}</TableCell>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>
                      <Chip
                        label={u.role === 'admin' ? 'Admin' : 'Cajero'}
                        size="small"
                        color={u.role === 'admin' ? 'primary' : 'default'}
                        variant="outlined"
                        sx={{
                          borderColor: u.role === 'admin' ? 'primary.main' : '#475569',
                          color: u.role === 'admin' ? 'primary.light' : 'text.secondary',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {u.gie_app_username ? (
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'success.light' }}>
                          {u.gie_app_username}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No configurado
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={u.is_active ? 'Activo' : 'Inactivo'}
                        size="small"
                        color={u.is_active ? 'success' : 'error'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => openEdit(u)} color="primary">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={u.is_active ? 'Desactivar' : 'Ya inactivo'}>
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={!u.is_active || u.id === currentUser?.id}
                            onClick={() => handleDeactivate(u)}
                          >
                            <PersonOffIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      <UserFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={loadUsers}
        user={editingUser}
      />
    </Box>
  );
};
