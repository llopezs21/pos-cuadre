import React from 'react';
import Drawer from '@mui/material/Drawer';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add'; // Un ícono más apropiado
import Box from '@mui/material/Box';
import { TransactionForm } from './components/TransactionForm';

export default function TransactionDrawer() {
  const [open, setOpen] = React.useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      <Fab 
        color="primary" 
        aria-label="agregar transacción"
        onClick={handleOpen}
        sx={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1300 }}
      >
        <AddIcon />
      </Fab>
      <Drawer anchor="right" open={open} onClose={handleClose}>
        <Box sx={{ width: { xs: '100vw', sm: 500, md: 600 }, p: 2, bgcolor: 'background.default', height: '100%' }}>
          <TransactionForm />
        </Box>
      </Drawer>
    </>
  );
}