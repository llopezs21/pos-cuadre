import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemText, CircularProgress, Typography, IconButton } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import toast from 'react-hot-toast';
import { useAppStore } from '../store';

interface Props {
  open: boolean;
  onClose: () => void;
  date?: string; // YYYY-MM-DD
  methodKey: string; // 'cash_usd' | 'cash_ves' | 'pos_banesco' | 'pos_mibanco'
}

export default function TransactionsByMethodModal({ open, onClose, date, methodKey }: Props) {
  const { selectedDate } = useAppStore(); // obtener la fecha seleccionada global si no se pasa por prop
  const effectiveDate = date || selectedDate;

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Array<{ txId: string; clientName: string; paymentAmount: number; bcvRate?: number; paymentId?: string }>>([]);

  useEffect(() => {
    if (!open) return;
    if (!effectiveDate) {
      setItems([]);
      return;
    }
    let mounted = true;
    setLoading(true);

    fetch(`/api/transactions?date=${encodeURIComponent(effectiveDate)}`)
      .then(res => res.json())
      .then((data) => {
        if (!mounted) return;
        // dedupe and filter by methodKey
        const list: any[] = [];
        const seen = new Set<string>();
        (data || []).forEach((tx: any) => {
          const payments = Array.isArray(tx.payments) ? tx.payments : [];
          payments.forEach((p: any) => {
            if (p.method !== methodKey) return;
            const key = p.id ? `${tx.id}-${p.id}` : `${tx.id}-${p.method}-${p.amount}`;
            if (seen.has(key)) return;
            seen.add(key);
            list.push({
              txId: tx.id,
              clientName: tx.clientName,
              paymentAmount: p.amount,
              bcvRate: p.bcvRate,
              paymentId: p.id
            });
          });
        });
        setItems(list);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));

    return () => { mounted = false; };
  }, [open, effectiveDate, methodKey]);

  // --- NUEVO: eliminar transacción (respeta mensaje del backend si la sesión está cerrada) ---
  const handleDeleteTransaction = async (txId: string) => {
    if (!window.confirm('¿Eliminar transacción? Esta acción es irreversible.')) return;
    try {
      const res = await fetch(`/api/transactions/${encodeURIComponent(txId)}`, { method: 'DELETE' });
      const text = await res.text().catch(() => '');
      if (!res.ok) {
        // Intentar parsear JSON message si existe
        try {
          const json = JSON.parse(text || '{}');
          const msg = json.message || text || 'Error al eliminar transacción.';
          toast.error(msg);
        } catch {
          toast.error(text || 'Error al eliminar transacción.');
        }
        return;
      }
      // éxito: remover items relacionados y mostrar toast
      setItems(prev => prev.filter(i => i.txId !== txId));
      toast.success('Transacción eliminada.');
    } catch (err) {
      console.error('Error deleting transaction', err);
      toast.error('Error al eliminar transacción.');
    }
  };
  // --- FIN handleDeleteTransaction ---

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="transactions-by-method">
      <DialogTitle id="transactions-by-method">Transacciones por método</DialogTitle>
      <DialogContent dividers>
        {!effectiveDate ? (
          <Typography color="text.secondary">Fecha no proporcionada. Selecciona la fecha de cierre para ver transacciones.</Typography>
        ) : loading ? (
          <CircularProgress />
        ) : items.length === 0 ? (
          <Typography>No se encontraron transacciones para este método en {effectiveDate}.</Typography>
        ) : (
          <>
            <Typography variant="body2" sx={{ mb: 1 }}>Fecha: {effectiveDate}</Typography>
            <List dense>
              {items.map((it, idx) => (
                <ListItem
                  key={idx}
                  secondaryAction={
                    <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteTransaction(it.txId)}>
                      <DeleteOutlineIcon />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={`Tx ${it.txId} — ${it.clientName}`}
                    secondary={`Monto: ${it.paymentAmount}${it.bcvRate ? ` (BCV: ${it.bcvRate})` : ''}`}
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
