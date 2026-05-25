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
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PaidIcon from '@mui/icons-material/Paid';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import { useAppStore } from '../store';
import { useTransactionSummary } from '../hooks/useTransactionSummary';
import type { FullTransaction } from '../services/api';

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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
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
    return transactions.filter(tx => {
      // Filtro 1: Por nombre de cliente
      const matchesSearch = tx.clientName.toLowerCase().includes(search.toLowerCase());
      
      // Filtro 2: Por método de pago
      const matchesPaymentMethod = selectedPaymentMethod === 'all' 
        || (Array.isArray(tx.payments) && tx.payments.some(p => p.method === selectedPaymentMethod));
      
      return matchesSearch && matchesPaymentMethod;
    });
  }, [transactions, search, selectedPaymentMethod]);

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

  // --- TOTALES: Delegados al hook personalizado ---
  const summary = useTransactionSummary(sortedTransactions);
  
  // Destructurar para mantener compatibilidad con el código de renderizado
  const {
    totalTransacciones,
    totalMontoBase,
    totalCashUSD,
    totalCashVES,
    totalPosBanesco,
    totalPosMiBanco
  } = summary;

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

      {/* Filtro por Método de Pago */}
      <Box sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200, bgcolor: '#1a1d23', borderRadius: 1 }}>
          <InputLabel sx={{ color: '#90caf9' }}>Filtrar por Método</InputLabel>
          <Select
            value={selectedPaymentMethod}
            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
            label="Filtrar por Método"
            sx={{ color: '#fff' }}
          >
            <MenuItem value="all">Todos los métodos</MenuItem>
            <MenuItem value="cash_usd">💵 Efectivo USD</MenuItem>
            <MenuItem value="cash_ves">💰 Efectivo VES</MenuItem>
            <MenuItem value="pos_banesco">🏦 POS Banesco</MenuItem>
            <MenuItem value="pos_mibanco">🏦 POS Mi Banco</MenuItem>
          </Select>
        </FormControl>
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