import { useAppStore } from '../store';
import { Button, Typography, Box } from '@mui/material';

interface StartSessionProps {
  embedded?: boolean;
}

export const StartSession = ({ embedded = false }: StartSessionProps) => {
  const startSession = useAppStore((state) => state.startSession);

  const content = (
    <>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
        No hay una jornada activa
      </Typography>
      <Typography variant="body1" sx={{ mb: 3, color: 'rgba(255,255,255,0.7)' }}>
        Para comenzar a registrar transacciones, por favor inicie una nueva jornada de caja.
      </Typography>
      <Button variant="contained" size="large" onClick={startSession}>
        Iniciar Jornada
      </Button>
    </>
  );

  if (embedded) {
    return <Box sx={{ textAlign: 'center' }}>{content}</Box>;
  }

  return (
    <Box
      sx={{
        p: 4,
        textAlign: 'center',
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: 2,
      }}
    >
      {content}
    </Box>
  );
};