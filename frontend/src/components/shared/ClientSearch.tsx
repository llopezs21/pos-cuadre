import { useState, useEffect } from 'react';
import { Autocomplete, Box, CircularProgress, Paper, TextField, Typography } from '@mui/material';
import { searchClients } from '../../services/api';
import toast from 'react-hot-toast';

interface ClientSearchProps {
  onClientSelect: (client: any | null) => void;
  selectedClient: any | null;
  label?: string;
}

/**
 * FASE 2: Componente reutilizable para búsqueda de clientes
 * Aplica 'Clean & Flat' design con tema oscuro consistente
 */
export const ClientSearch = ({ onClientSelect, selectedClient, label = "Buscar Cliente" }: ClientSearchProps) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Búsqueda de clientes con debounce
  useEffect(() => {
    if (inputValue === '' || !open) {
      setOptions([]);
      return;
    }

    setLoadingSearch(true);
    const timeoutId = setTimeout(() => {
      searchClients(inputValue)
        .then(res => {
          setOptions(res.data || []);
          setLoadingSearch(false);
        })
        .catch(err => {
          console.error('Error al buscar clientes:', err);
          toast.error('Error al buscar clientes');
          setOptions([]);
          setLoadingSearch(false);
        });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [inputValue, open]);

  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 2, 
        mb: 3, 
        backgroundColor: '#1e293b', 
        borderRadius: 1,
        border: '1px solid rgba(255,255,255,0.1)' // FASE 2: Borde sutil
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="subtitle2" sx={{ color: '#cbd5e1' }}>
          {label}
        </Typography>
      </Box>
      <Autocomplete
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        options={options}
        loading={loadingSearch}
        filterOptions={(x) => x}
        getOptionLabel={(option) => `${option.name} - ${option.id_number}` || ""}
        isOptionEqualToValue={(option, value) => option.mks_id === value.mks_id}
        onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
        onChange={(_, newValue) => onClientSelect(newValue)}
        value={selectedClient}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Nombre o cédula..."
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loadingSearch ? <CircularProgress size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
            sx={{
              '& .MuiInputBase-root': {
                backgroundColor: '#0f172a', // FASE 2: Fondo oscuro
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)' // FASE 2: Borde sutil
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255,255,255,0.1)' // FASE 2: Sin fondo gris nativo
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255,255,255,0.2)'
              },
              '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#60a5fa'
              },
              '& .MuiInputLabel-root': {
                color: '#94a3b8'
              }
            }}
          />
        )}
      />
    </Paper>
  );
};
