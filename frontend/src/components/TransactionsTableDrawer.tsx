import * as React from 'react';
import Drawer from '@mui/material/Drawer';
import Fab from '@mui/material/Fab';
import ListAltIcon from '@mui/icons-material/ListAlt';
import Box from '@mui/material/Box';
import { TransactionsTable } from './TransactionsTable';
import CircularProgress from '@mui/material/CircularProgress';

interface TransactionsTableDrawerProps {
  transactions: any[];
  loading: boolean;
}

export default function TransactionsTableDrawer({ transactions, loading }: TransactionsTableDrawerProps) {
  const [open, setOpen] = React.useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      <Fab 
        color="secondary" 
        aria-label="ver transacciones"
        onClick={handleOpen}
        sx={{ position: 'fixed', bottom: 100, right: 32, zIndex: 1300 }}
      >
        <ListAltIcon />
      </Fab>
      <Drawer anchor="right" open={open} onClose={handleClose}>
        <Box sx={{ width: { xs: 340, sm: 500 }, p: 2, bgcolor: 'background.default', height: '100%' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : (
            <TransactionsTable transactions={transactions} />
          )}
        </Box>
      </Drawer>
    </>
  );
}
