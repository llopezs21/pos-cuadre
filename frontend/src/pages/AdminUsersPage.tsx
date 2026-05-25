import React, { useEffect, useState } from 'react';
import { Container, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, TextField, Button, Box, CircularProgress } from '@mui/material';
import { getUsers, updateUserGieUsername } from '../services/api';
import toast from 'react-hot-toast';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = async () => {
    try {
      const res = await getUsers();
      setUsers(res.data || []);
    } catch (err) {
      toast.error('Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (id: number, value: string) => {
    setSavingId(id);
    try {
      await updateUserGieUsername(id, value || null);
      toast.success('Guardado');
      await load();
    } catch (err) {
      toast.error('Error al guardar');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 3, mt: 4 }}>
        <Typography variant="h4" gutterBottom>Gestionar Responsables GIE-APP (Usuarios)</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>GIE-APP Username</TableCell>
              <TableCell>Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.id}>
                <TableCell>{u.id}</TableCell>
                <TableCell>{u.username}</TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell>
                  <TextField defaultValue={u.gie_app_username || ''} size="small" onBlur={(e) => handleSave(u.id, e.target.value)} />
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={() => handleSave(u.id, (document.querySelector(`input[value="${u.gie_app_username || ''}"]`) as HTMLInputElement)?.value || '')} disabled={savingId === u.id}>
                    {savingId === u.id ? 'Guardando...' : 'Guardar'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
};
