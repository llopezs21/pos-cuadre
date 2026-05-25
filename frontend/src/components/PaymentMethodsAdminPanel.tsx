import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Switch, FormControlLabel } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { fetchPaymentMethods, createPaymentMethod, updatePaymentMethod } from '../services/paymentMethodsApi';
import { useAppStore } from '../store'; // adapta si tu store está en otra ruta

type PM = {
	id: number;
	name: string;
	code: string;
	currency: string;
	is_active: boolean;
	requires_responsable: boolean;
	generates_commission: boolean;
	created_at?: string;
	updated_at?: string;
};

const emptyForm = { name: '', code: '', currency: 'USD', is_active: true, requires_responsable: false, generates_commission: false };

const PaymentMethodsAdminPanel: React.FC = () => {
	const { user } = useAppStore(); // asumo store expone user con role
	const [methods, setMethods] = useState<PM[]>([]);
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const [editing, setEditing] = useState<PM | null>(null);
	const [form, setForm] = useState<typeof emptyForm>(emptyForm);
	const isAdmin = user?.role === 'admin';

	useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

	const load = async () => {
		setLoading(true);
		try {
			const data = await fetchPaymentMethods();
			setMethods(data);
		} catch (e) {
			console.error(e);
		} finally { setLoading(false); }
	};

	const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
	const openEdit = (m: PM) => { setEditing(m); setForm({ name: m.name, code: m.code, currency: m.currency, is_active: m.is_active, requires_responsable: m.requires_responsable, generates_commission: m.generates_commission }); setOpen(true); };

	const handleSave = async () => {
		try {
			if (editing) {
				await updatePaymentMethod(editing.id, form);
			} else {
				await createPaymentMethod(form);
			}
			await load();
			setOpen(false);
		} catch (err) {
			console.error(err);
			alert((err as Error).message || 'Error');
		}
	};

	if (!isAdmin) return <Typography color="text.secondary">Acceso restringido. Solo administradores.</Typography>;

	return (
		<Box>
			<Paper sx={{ p: 2, mb: 2 }}>
				<Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
					<Typography variant="h6">Administración de Métodos de Pago</Typography>
					<Button variant="contained" onClick={openCreate}>Nuevo Método</Button>
				</Box>

				{loading ? <Typography>Cargando...</Typography> : (
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Nombre</TableCell>
								<TableCell>Código</TableCell>
								<TableCell>Divisa</TableCell>
								<TableCell>Activo</TableCell>
								<TableCell>Responsable</TableCell>
								<TableCell>Comisión</TableCell>
								<TableCell>Acciones</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{methods.map(m => (
								<TableRow key={m.id}>
									<TableCell>{m.name}</TableCell>
									<TableCell>{m.code}</TableCell>
									<TableCell>{m.currency}</TableCell>
									<TableCell>{m.is_active ? 'Sí' : 'No'}</TableCell>
									<TableCell>{m.requires_responsable ? 'Sí' : 'No'}</TableCell>
									<TableCell>{m.generates_commission ? 'Sí' : 'No'}</TableCell>
									<TableCell>
										<IconButton size="small" onClick={() => openEdit(m)}><EditIcon fontSize="small" /></IconButton>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</Paper>

			<Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
				<DialogTitle>{editing ? 'Editar Método' : 'Nuevo Método'}</DialogTitle>
				<DialogContent>
					<TextField label="Nombre" fullWidth value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} sx={{ mt: 1 }} />
					<TextField label="Código" fullWidth value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} sx={{ mt: 1 }} />
					<TextField label="Divisa" fullWidth value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} sx={{ mt: 1 }} />
					<FormControlLabel control={<Switch checked={form.is_active} onChange={(_, v) => setForm({ ...form, is_active: v })} />} label="Activo" />
					<FormControlLabel control={<Switch checked={form.requires_responsable} onChange={(_, v) => setForm({ ...form, requires_responsable: v })} />} label="Requiere responsable" />
					<FormControlLabel control={<Switch checked={form.generates_commission} onChange={(_, v) => setForm({ ...form, generates_commission: v })} />} label="Genera comisión" />
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpen(false)}>Cancelar</Button>
					<Button variant="contained" onClick={handleSave}>{editing ? 'Guardar' : 'Crear'}</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
};

export default PaymentMethodsAdminPanel;
