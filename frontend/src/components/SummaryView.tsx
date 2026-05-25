import React, { useState } from 'react';
import { Paper, Stack, Box, Divider, Typography, List, ListItem, ListItemText, Button } from '@mui/material';
import TransactionsByMethodModal from './TransactionsByMethodModal';
import DifferencesModal from './DifferencesModal';

// Definimos el tipo de dato que espera el componente para mayor seguridad
interface SummaryProps {
  summary: {
    totalsByMethod: {
      totalCashUSD: number;
      totalCashVES: number;
      totalPosMiBanco: number;
      totalPosBanesco: number;
    };
    totalsByCategory: {
      totalMikrowispUSD: number;
      totalSupportInstallationUSD: number;
    };
    differences: Array<{
      client: string;
      amount: number;
      notes: string;
    }>;
  } | null; // El sumario puede ser null al principio
  date?: string; // opcional: YYYY-MM-DD para poder consultar transacciones del día
}

export const SummaryView: React.FC<SummaryProps> = ({ summary, date }) => {
  if (!summary) {
    return <Typography>No hay resumen para mostrar.</Typography>;
  }
  const { totalsByMethod, totalsByCategory, differences } = summary;

  // Estado para modales
  const [methodToShow, setMethodToShow] = useState<string | null>(null);
  const [openDifferences, setOpenDifferences] = useState(false);

  // Mapeo visual -> método interno
  const methodMap: Record<string, string> = {
    'Efectivo USD': 'cash_usd',
    'Efectivo VES': 'cash_ves',
    'Punto Mi Banco': 'pos_mibanco',
    'Punto Banesco': 'pos_banesco',
  };

  const openMethodModal = (methodKey: string) => {
    setMethodToShow(methodKey);
  };
  const closeMethodModal = () => setMethodToShow(null);

  return (
    <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto' }}>
      <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, width: '100%' }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
          Resumen del Cierre
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} divider={<Divider flexItem orientation="vertical" sx={{ borderColor: 'primary.dark', opacity: 0.2 }} />}>
          <Box flex={1}>
            <Typography variant="h6" sx={{ mb: 1, color: 'secondary.main', fontWeight: 600 }}>Totales por Método</Typography>
            <List dense>
              <ListItem secondaryAction={
                <Button size="small" onClick={() => openMethodModal(methodMap['Efectivo USD'])}>Ver transacciones</Button>
              }>
                <ListItemText primary="Efectivo USD" secondary={`$${totalsByMethod.totalCashUSD.toFixed(2)}`} />
              </ListItem>

              <ListItem secondaryAction={
                <Button size="small" onClick={() => openMethodModal(methodMap['Efectivo VES'])}>Ver transacciones</Button>
              }>
                <ListItemText primary="Efectivo VES" secondary={`${totalsByMethod.totalCashVES.toFixed(2)} VES`} />
              </ListItem>

              <ListItem secondaryAction={
                <Button size="small" onClick={() => openMethodModal(methodMap['Punto Mi Banco'])}>Ver transacciones</Button>
              }>
                <ListItemText primary="Punto Mi Banco" secondary={`${totalsByMethod.totalPosMiBanco.toFixed(2)} VES`} />
              </ListItem>

              <ListItem secondaryAction={
                <Button size="small" onClick={() => openMethodModal(methodMap['Punto Banesco'])}>Ver transacciones</Button>
              }>
                <ListItemText primary="Punto Banesco" secondary={`${totalsByMethod.totalPosBanesco.toFixed(2)} VES`} />
              </ListItem>
            </List>
          </Box>

          <Box flex={1}>
            <Typography variant="h6" sx={{ mb: 1, color: 'secondary.main', fontWeight: 600 }}>Totales por Categoría</Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="Mikrowisp (Servicios)" secondary={`$${totalsByCategory.totalMikrowispUSD.toFixed(2)}`} />
              </ListItem>
              <ListItem>
                <ListItemText primary="Soporte/Instalación" secondary={`$${totalsByCategory.totalSupportInstallationUSD.toFixed(2)}`} />
              </ListItem>
            </List>

            <Divider sx={{ my: 2, borderColor: 'primary.dark', opacity: 0.2 }} />

            <Typography variant="h6" color="error" sx={{ fontWeight: 700, mb: 1 }}>Diferencias Detectadas</Typography>
            <Button variant="outlined" size="small" onClick={() => setOpenDifferences(true)} sx={{ mb: 1 }}>
              Mostrar diferencias ({differences.length})
            </Button>
          </Box>
        </Stack>
      </Paper>

      {/* Modales */}
      <TransactionsByMethodModal
        open={!!methodToShow}
        onClose={closeMethodModal}
        date={date}
        methodKey={methodToShow || ''}
      />
      <DifferencesModal
        open={openDifferences}
        onClose={() => setOpenDifferences(false)}
        differences={differences}
      />
    </Box>
  );
};