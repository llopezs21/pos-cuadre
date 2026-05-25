import { Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemText, Typography } from '@mui/material';

interface Diff {
  client: string;
  amount: number;
  notes: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  differences: Diff[];
}

export default function DifferencesModal({ open, onClose, differences }: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="differences-modal">
      <DialogTitle id="differences-modal">Diferencias Detectadas</DialogTitle>
      <DialogContent dividers>
        {differences.length === 0 ? (
          <Typography>No se encontraron diferencias.</Typography>
        ) : (
          <List dense>
            {differences.map((d, i) => (
              <ListItem key={i}>
                <ListItemText
                  primary={`${d.client} — $${d.amount.toFixed(2)}`}
                  secondary={d.notes}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
