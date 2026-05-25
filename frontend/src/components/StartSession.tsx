import { useAppStore } from '../store';
import { Button, Typography, Paper } from '@mui/material';

export const StartSession = () => {
  const startSession = useAppStore((state) => state.startSession);

  return (
    <Paper sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>
        No hay una jornada activa
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Para comenzar a registrar transacciones, por favor inicia una nueva jornada de caja.
      </Typography>
      <Button variant="contained" size="large" onClick={startSession}>
        Iniciar Jornada
      </Button>
    </Paper>
  );
};