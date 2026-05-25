import { useState } from 'react';
import { Box, ToggleButtonGroup, ToggleButton } from '@mui/material';

// Importa los 3 sub-formularios que hemos creado
import { InvoicePaymentForm } from './InvoicePaymentForm';
import { ManualEntryForm } from './ManualEntryForm';
import { AbonoForm } from './AbonoForm';

export const TransactionForm = () => {
    const [formMode, setFormMode] = useState<'invoice' | 'manual' | 'abono'>('invoice');

    const handleModeChange = (_: React.MouseEvent<HTMLElement>, newMode: string | null) => {
        if (newMode !== null) {
            setFormMode(newMode as any);
        }
    };

    return (
        <Box>
            <ToggleButtonGroup
                value={formMode}
                exclusive
                onChange={handleModeChange}
                fullWidth
                sx={{ mb: 3 }}
                color="primary"
            >
                <ToggleButton value="invoice">Cobrar Factura</ToggleButton>
                <ToggleButton value="manual">Registro Manual</ToggleButton>
                <ToggleButton value="abono">Registrar Abono</ToggleButton>
            </ToggleButtonGroup>
            {formMode === 'invoice' && <InvoicePaymentForm />}
            {formMode === 'manual' && <ManualEntryForm />}
            {formMode === 'abono' && <AbonoForm />}
        </Box>
    );
};