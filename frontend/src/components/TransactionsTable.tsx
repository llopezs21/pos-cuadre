import React, { useState, useMemo } from 'react';
import {
  Paper,
  Box,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Divider,
  Stack
} from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PaidIcon from '@mui/icons-material/Paid';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { useAppStore } from '../store';
import type { FullTransaction } from '../services/api';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';

interface TransactionsTableProps {
  transactions: FullTransaction[];
}

type Order = 'asc' | 'desc';
// Agregamos 'hora' como clave especial para ordenar por hora
type SortKey = keyof FullTransaction | 'hora';

export const TransactionsTable: React.FC<TransactionsTableProps> = ({ transactions = [] }) => {
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<SortKey>('createdAt');
  const [search, setSearch] = useState('');
  const { removeTransaction, openEditModal } = useAppStore();

  const handleSort = (key: SortKey) => {
    const isAsc = orderBy === key && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(key);
  };

  const handleDelete = (transactionId: string, clientName: string) => {
    // --- PASO DE DEPURACIÓN ---
    console.log('ID que se enviará desde el frontend:', transactionId);

    if (window.confirm(`¿Estás seguro de que deseas eliminar la transacción de ${clientName}?`)) {
      removeTransaction(transactionId);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx =>
      tx.clientName.toLowerCase().includes(search.toLowerCase())
    );
  }, [transactions, search]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Si el orden es por 'hora', usamos la hora de createdAt
      if (orderBy === 'hora') {
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
      } else {
        aValue = a[orderBy as keyof FullTransaction];
        bValue = b[orderBy as keyof FullTransaction];
      }

      // 1. Manejar casos nulos o indefinidos (los envía al final)
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      let comparison = 0;

      // 2. Comparar específicamente por tipo de dato
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        if (aValue < bValue) comparison = -1;
        if (aValue > bValue) comparison = 1;
      }

      // 3. Aplicar la dirección del orden (ascendente o descendente)
      return order === 'asc' ? comparison : -comparison;
    });
  }, [filteredTransactions, order, orderBy]);

  // --- TOTALES ---
  const totalTransacciones = sortedTransactions.length;
  const totalMontoBase = sortedTransactions.reduce((sum, tx) => sum + Number(tx.invoiceBaseUSD), 0);

  // NUEVOS TOTALES POR TIPO DE CAMBIO
  const totalCashUSD = sortedTransactions.reduce((sum, tx) => {
    const payment = tx.payments.find(p => p.method === 'cash_usd');
    return sum + (payment ? Number(payment.amount) : 0);
  }, 0);

  const totalCashVES = sortedTransactions.reduce((sum, tx) => {
    const payment = tx.payments.find(p => p.method === 'cash_ves');
    return sum + (payment ? Number(payment.amount) : 0);
  }, 0);

  const totalPosBanesco = sortedTransactions.reduce((sum, tx) => {
    const payment = tx.payments.find(p => p.method === 'pos_banesco');
    return sum + (payment ? Number(payment.amount) : 0);
  }, 0);

  const totalPosMiBanco = sortedTransactions.reduce((sum, tx) => {
    const payment = tx.payments.find(p => p.method === 'pos_mibanco');
    return sum + (payment ? Number(payment.amount) : 0);
  }, 0);

  // Abreviaciones y/o iconos para métodos de pago
  const paymentMethodInfo: Record<string, { label: string; icon: React.ReactNode }> = {
    cash_usd:   { label: 'USD', icon: <AttachMoneyIcon fontSize="small" sx={{ color: '#4caf50' }} /> },
    cash_ves:   { label: 'VES', icon: <PaidIcon fontSize="small" sx={{ color: '#ffb300' }} /> },
    pos_banesco: { label: 'BAN', icon: <AccountBalanceIcon fontSize="small" sx={{ color: '#0067ba' }} /> },
    pos_mibanco: { label: 'R4', icon: <AccountBalanceIcon fontSize="small" sx={{ color: '#ff5101' }} /> },
  };

  return (
    <Paper
      sx={{
        p: { xs: 1, sm: 2 },
        width: '100%',
        maxWidth: 1200,
        mx: 'auto',
        bgcolor: '#23272f',
        borderRadius: 4,
        boxShadow: 6,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" color="primary.light" fontWeight={700}>
          Transacciones del Día
        </Typography>
        <TextField
          label="Buscar Cliente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          variant="outlined"
          size="small"
          sx={{ bgcolor: '#1a1d23', borderRadius: 2, input: { color: '#fff' } }}
        />
      </Box>
      <TableContainer sx={{ width: '100%', borderRadius: 2 }}>
        <Table stickyHeader size="small" sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#181b20' }}>
              <TableCell width="20%" sortDirection={orderBy === 'clientName' ? order : false} sx={{ color: '#90caf9', fontWeight: 600 }}>
                <TableSortLabel active={orderBy === 'clientName'} direction={orderBy === 'clientName' ? order : 'asc'} onClick={() => handleSort('clientName')}>
                  Cliente
                </TableSortLabel>
              </TableCell>
              <TableCell width="15%" sx={{ color: '#90caf9', fontWeight: 600 }}>
                Tipo
              </TableCell>
              <TableCell width="15%" align="right" sortDirection={orderBy === 'invoiceBaseUSD' ? order : false} sx={{ color: '#90caf9', fontWeight: 600 }}>
                <TableSortLabel active={orderBy === 'invoiceBaseUSD'} direction={orderBy === 'invoiceBaseUSD' ? order : 'asc'} onClick={() => handleSort('invoiceBaseUSD')}>
                  Monto Base
                </TableSortLabel>
              </TableCell>
              <TableCell width="30%" sx={{ color: '#90caf9', fontWeight: 600 }}>Pagos Realizados</TableCell>
              <TableCell width="15%" sortDirection={orderBy === 'hora' ? order : false} sx={{ color: '#90caf9', fontWeight: 600 }}>
                <TableSortLabel
                  active={orderBy === 'hora'}
                  direction={orderBy === 'hora' ? order : 'asc'}
                  onClick={() => handleSort('hora')}
                >
                  Hora
                </TableSortLabel>
              </TableCell>
              <TableCell width="10%" align="center" sx={{ color: '#90caf9', fontWeight: 600 }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedTransactions.map((tx) => (
              <TableRow key={tx.id} hover sx={{ bgcolor: '#262a33', '&:hover': { bgcolor: '#31343c' } }}>
                <TableCell>{tx.clientName}</TableCell>
                <TableCell>{tx.invoiceType}</TableCell>
                <TableCell align="right">
                  ${Number(tx.invoiceBaseUSD).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {tx.payments.map((p, idx) => (
                      <Box key={idx} display="flex" alignItems="center" sx={{ mr: 1 }}>
                        {paymentMethodInfo[p.method]?.icon}
                        <Typography variant="body2" sx={{ ml: 0.5, fontWeight: 500 }}>
                          {paymentMethodInfo[p.method]?.label}: {Number(p.amount).toFixed(2)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </TableCell>
                <TableCell>{new Date(tx.createdAt).toLocaleTimeString()}</TableCell>
                <TableCell align="center">
                  <Box display="flex" alignItems="center" justifyContent="center">
                    <IconButton color="primary" onClick={() => openEditModal(tx)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="warning" onClick={() => handleDelete(tx.id, tx.clientName)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {/* --- FILA DE TOTALES --- */}
            <TableRow sx={{ bgcolor: '#181b20', fontWeight: 700 }}>
              <TableCell colSpan={2} sx={{ color: '#fff', fontWeight: 700 }}>
                Totales
              </TableCell>
              <TableCell align="right" sx={{ color: '#fff', fontWeight: 700 }}>
                ${totalMontoBase.toFixed(2)}
              </TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 700 }}>
                USD: ${totalCashUSD.toFixed(2)}<br />
                VES: {totalCashVES.toFixed(2)}<br />
                Banesco: {totalPosBanesco.toFixed(2)}<br />
                MiBanco: {totalPosMiBanco.toFixed(2)}
              </TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 700 }}>
                {totalTransacciones}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <Divider sx={{ my: 2, bgcolor: '#444857' }} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1" color="primary.light">
          Total transacciones: <b>{totalTransacciones}</b>
        </Typography>
        <Typography variant="subtitle1" color="success.light">
          Suma Monto Base: <b>${totalMontoBase.toFixed(2)}</b>
        </Typography>
        <Typography variant="subtitle1" color="info.light">
          USD: <b>${totalCashUSD.toFixed(2)}</b>
        </Typography>
        <Typography variant="subtitle1" color="warning.light">
          VES: <b>{totalCashVES.toFixed(2)}</b>
        </Typography>
        <Typography variant="subtitle1" color="secondary.light">
          Banesco: <b>{totalPosBanesco.toFixed(2)}</b>
        </Typography>
        <Typography variant="subtitle1" color="secondary.light">
          MiBanco: <b>{totalPosMiBanco.toFixed(2)}</b>
        </Typography>
      </Stack>
    </Paper>
  );
};