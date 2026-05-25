import { useState } from 'react';
import { useAppStore } from '../store';
import { Container, Typography, Paper, Button, Box, CircularProgress, Alert, Divider, AppBar, Toolbar } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link as RouterLink } from 'react-router-dom';

export const AdminSyncPage = () => {
    // Hooks para facturas
    const { uploadInvoicesFile, loading: invoicesLoading, syncResult: invoicesSyncResult, error: invoicesError } = useAppStore();
    const [selectedInvoiceFile, setSelectedInvoiceFile] = useState<File | null>(null);

    // Hooks para clientes
    const { uploadClientsFile, loading: clientsLoading, clientSyncResult, error: clientsError, user } = useAppStore();
    const [selectedClientFile, setSelectedClientFile] = useState<File | null>(null);

    return (
        <>
            <AppBar position="static" color="primary" sx={{ mb: 3 }}>
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Button
                            component={RouterLink}
                            to="/"
                            color="inherit"
                            startIcon={<ArrowBackIcon />}
                            sx={{ textTransform: 'none' }}
                        >
                            Volver al Dashboard
                        </Button>
                        <Typography variant="h6" component="div">
                            Panel de Sincronización de Datos
                        </Typography>
                    </Box>
                    {user && (
                        <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'secondary.light' }}>
                            Usuario: {user.username}
                        </Typography>
                    )}
                </Toolbar>
            </AppBar>
            <Container maxWidth="md" sx={{ mt: 4 }}>
                {/* --- SECCIÓN PARA SINCRONIZAR FACTURAS --- */}
                <Paper sx={{ p: 3, mb: 4 }}>
                    <Typography variant="h6" gutterBottom>1. Sincronizar Facturas</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Button variant="outlined" component="label">
                            Seleccionar Archivo de Facturas
                            <input type="file" hidden onChange={(e) => e.target.files && setSelectedInvoiceFile(e.target.files[0])} accept=".csv" />
                        </Button>
                        {selectedInvoiceFile && <Typography>{selectedInvoiceFile.name}</Typography>}
                    </Box>
                    <Button variant="contained" onClick={() => selectedInvoiceFile && uploadInvoicesFile(selectedInvoiceFile)} disabled={!selectedInvoiceFile || invoicesLoading} sx={{ mt: 3 }}>
                        {invoicesLoading ? <CircularProgress size={24} /> : 'Sincronizar Facturas'}
                    </Button>
                    {invoicesSyncResult && (
                        <Alert severity="success" sx={{ mt: 3 }}>
                            <Typography><strong>Sincronización Completada</strong></Typography>
                            <Typography>Facturas Procesadas: {invoicesSyncResult.processed}</Typography>
                            <Typography>Nuevas Facturas Creadas: {invoicesSyncResult.created}</Typography>
                            <Typography>Pagos Externos Reconciliados: {invoicesSyncResult.reconciled}</Typography>
                        </Alert>
                    )}
                    {invoicesError && <Alert severity="error" sx={{ mt: 3 }}>{invoicesError}</Alert>}

                    {/* Guía de columnas para external_invoices */}
                    <Box sx={{ mt: 3, p: 2, backgroundColor: 'background.paper', borderRadius: 1 }}>
                        <Typography variant="subtitle1" gutterBottom><strong>Guía de columnas - Facturas (external_invoices)</strong></Typography>
                        <Box component="pre" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', m: 0 }}>
{`REQUIRED COLUMNS (CSV):
mks_invoice_number, client_mks_id, amount, issue_date, due_date, status, payment_method_external, our_transaction_id`}
                        </Box>
                    </Box>
                </Paper>

                <Divider sx={{ mb: 4 }} />

                {/* --- SECCIÓN PARA SINCRONIZAR CLIENTES --- */}
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>2. Sincronizar Clientes</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Button variant="outlined" component="label">
                            Seleccionar Archivo de Clientes
                            <input type="file" hidden onChange={(e) => e.target.files && setSelectedClientFile(e.target.files[0])} accept=".csv" />
                        </Button>
                        {selectedClientFile && <Typography>{selectedClientFile.name}</Typography>}
                    </Box>
                    <Button variant="contained" onClick={() => selectedClientFile && uploadClientsFile(selectedClientFile)} disabled={!selectedClientFile || clientsLoading} sx={{ mt: 3 }}>
                        {clientsLoading ? <CircularProgress size={24} /> : 'Sincronizar Clientes'}
                    </Button>
                    {clientSyncResult && (
                        <Alert severity="success" sx={{ mt: 3 }}>
                            <Typography><strong>Sincronización Completada</strong></Typography>
                            <Typography>Clientes Procesados: {clientSyncResult.processed}</Typography>
                            <Typography>Nuevos Clientes Creados: {clientSyncResult.created}</Typography>
                            <Typography>Clientes Actualizados: {clientSyncResult.updated}</Typography>
                        </Alert>
                    )}
                    {clientsError && <Alert severity="error" sx={{ mt: 3 }}>{clientsError}</Alert>}

                    {/* Guía de columnas para clientes (external_clients) */}
                    <Box sx={{ mt: 3, p: 2, backgroundColor: 'background.paper', borderRadius: 1 }}>
                        <Typography variant="subtitle1" gutterBottom><strong>Guía de columnas - Clientes (external_clients)</strong></Typography>
                        <Box component="pre" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', m: 0 }}>
{`REQUIRED COLUMNS (CSV):
mks_id, name, id_number, phone, email`}
                        </Box>
                    </Box>
                </Paper>
            </Container>
        </>
    );
};