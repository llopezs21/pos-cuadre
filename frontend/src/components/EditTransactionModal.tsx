import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack, Typography } from '@mui/material';

export const EditTransactionModal = () => {
    const { isEditModalOpen, transactionToEdit, closeEditModal, updateTransactionDate } = useAppStore();
    
    const [newDate, setNewDate] = useState('');

    useEffect(() => {
        if (transactionToEdit && transactionToEdit.createdAt) {
            const date = new Date(transactionToEdit.createdAt);
            const formattedDate = date.toISOString().split('T')[0];
            setNewDate(formattedDate);
        } else {
            setNewDate('');
        }
    }, [transactionToEdit]);

    if (!isEditModalOpen) {
        return null;
    }

    const handleSave = () => {
        if (!transactionToEdit?.id || !newDate) return;
        // El nuevo timestamp será la fecha seleccionada a las 12:00 del mediodía
        const finalTimestamp = `${newDate}T12:00:00`;
        updateTransactionDate(transactionToEdit.id, finalTimestamp);
    };

    return (
        <Dialog open={isEditModalOpen} onClose={closeEditModal} fullWidth maxWidth="xs">
            <DialogTitle>Editar Fecha de Transacción</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Typography>
                        <strong>Cliente:</strong> {transactionToEdit?.clientName}
                    </Typography>
                    <Typography>
                        <strong>Monto:</strong> ${Number(transactionToEdit?.invoiceBaseUSD || 0).toFixed(2)}
                    </Typography>
                    <TextField
                        label="Nueva Fecha de la Transacción"
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={closeEditModal}>Cancelar</Button>
                <Button onClick={handleSave} variant="contained">Guardar Cambios</Button>
            </DialogActions>
        </Dialog>
    );
};