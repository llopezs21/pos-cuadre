import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { Typography, Accordion, AccordionSummary, AccordionDetails, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, CircularProgress } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getTransactionsBySessionId } from '../services/api';
import { exportSessionToExcel } from '../utils/exportToExcel';

// --- LÓGICA DE COLOR CORREGIDA Y EXPORTACIÓN ---
interface ComparisonRowProps {
    title: string;
    system: number;
    user: number;
    isVes?: boolean;
}

const ComparisonRow: React.FC<ComparisonRowProps> = ({ title, system, user, isVes = false }) => {
    const sysNum = Number(system) || 0;
    const userNum = Number(user) || 0;
    const difference = userNum - sysNum;

    let color = 'inherit';
    if (difference > 0.01) {
        color = 'success.main';
    } else if (difference < -0.01) {
        color = 'error.main';
    }

    return (
        <TableRow>
            <TableCell>{title}</TableCell>
            <TableCell align="right">{isVes ? '' : '$'}{sysNum.toFixed(2)}</TableCell>
            <TableCell align="right">{isVes ? '' : '$'}{userNum.toFixed(2)}</TableCell>
            <TableCell align="right" sx={{ color, fontWeight: 'bold' }}>
                {difference > 0 ? '+' : ''}{isVes ? '' : '$'}{difference.toFixed(2)}
            </TableCell>
        </TableRow>
    );
};

// --- COMPONENTE MEJORADO ---
const SessionTransactions = ({ session }: { session: any }) => {
    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        getTransactionsBySessionId(session.id)
            .then(res => {
                const data = Array.isArray(res.data) ? res.data : [];
                setTransactions(data);
            })
            .catch(() => setError('No se pudieron cargar las transacciones'))
            .finally(() => setLoading(false));
    }, [session.id]);

    if (loading) return <Box sx={{ p: 2 }}><CircularProgress size={24} /></Box>;
    if (error) return <Typography color="error">{error}</Typography>;
    if (transactions.length === 0) return <Typography sx={{ p: 2 }}>No hay transacciones para este cierre.</Typography>;

    return (
        <>
            <Button
                variant="contained"
                color="success"
                onClick={() => exportSessionToExcel(session, transactions)}
                sx={{ mb: 2 }}
            >
                Exportar a Excel
            </Button>
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Cliente</TableCell>
                            <TableCell>Tipo</TableCell>
                            <TableCell align="right">Monto USD</TableCell>
                            <TableCell>Pagos</TableCell>
                            <TableCell>Fecha</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {transactions.map(tx => (
                            <TableRow key={tx.id}>
                                <TableCell>{tx.clientName}</TableCell>
                                <TableCell>{tx.invoiceType}</TableCell>
                                <TableCell align="right">${Number(tx.invoiceBaseUSD).toFixed(2)}</TableCell>
                                <TableCell>{(tx.payments || []).map((p: any) => p.method).join(', ')}</TableCell>
                                <TableCell>{tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString() : ''}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    );
};

export const AdminSessionsPage = () => {
    const { sessionsHistory, fetchSessionsHistory } = useAppStore();
    const [openTxSession, setOpenTxSession] = useState<number | null>(null);

    useEffect(() => {
        fetchSessionsHistory();
        // eslint-disable-next-line
    }, []);

    return (
        <Box sx={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                {sessionsHistory.length === 0 && (
                    <Paper sx={{ p: 4, textAlign: 'center', mb: 3 }}>
                        <Typography variant="h6" color="text.secondary">
                            No hay cierres de caja registrados.
                        </Typography>
                    </Paper>
                )}
                {sessionsHistory.map((session) => (
                    <Accordion key={session.id}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography sx={{ width: '33%', flexShrink: 0 }}>
                                Sesión #{session.id}
                            </Typography>
                            <Typography sx={{ color: 'text.secondary' }}>
                                Cerrada por: {session.username} el {new Date(session.closedAt).toLocaleString()}
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="h6" gutterBottom>Cuadre Detallado</Typography>
                            <TableContainer component={Paper} sx={{ mb: 2 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Método de Pago</TableCell>
                                            <TableCell align="right">Sistema Esperado</TableCell>
                                            <TableCell align="right">Usuario Contó</TableCell>
                                            <TableCell align="right">Diferencia</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        <ComparisonRow title="Efectivo USD" system={session.system_totals?.cash_usd} user={session.closing_cash_usd} />
                                        <ComparisonRow title="Efectivo VES" system={session.system_totals?.cash_ves} user={session.closing_cash_ves} isVes />
                                        <ComparisonRow title="Punto Banesco (VES)" system={session.system_totals?.pos_banesco} user={session.closing_pos_banesco_total} isVes />
                                        <ComparisonRow title="Punto Mi Banco (VES)" system={session.system_totals?.pos_mibanco} user={session.closing_pos_mibanco_total} isVes />
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <Box sx={{ mt: 2, p: 2, border: '1px solid grey', borderRadius: 1, backgroundColor: 'background.default' }}>
                                <Typography><strong>Lote Banesco:</strong> {session.closing_pos_banesco_lote}</Typography>
                                <Typography><strong>Lote Mi Banco:</strong> {session.closing_pos_mibanco_lote}</Typography>
                                <Typography>
                                    <strong>Total Reportado en Mikrowisp:</strong> ${Number(session.closing_mikrowisp_total || 0).toFixed(2)}
                                </Typography>
                                <Typography variant="h6" color={Math.abs(Number(session.discrepancy)) > 0.01 ? 'error' : 'inherit'} sx={{ mt: 1 }}>
                                    Discrepancia Total (USD): ${Number(session.discrepancy || 0).toFixed(2)}
                                </Typography>
                            </Box>
                            {/* --- BOTÓN Y TABLA DE TRANSACCIONES --- */}
                            <Box sx={{ mt: 2 }}>
                                <Button
                                    variant="outlined"
                                    onClick={() => setOpenTxSession(openTxSession === session.id ? null : session.id)}
                                    sx={{ mb: 1 }}
                                >
                                    {openTxSession === session.id ? 'Ocultar Transacciones' : 'Ver Transacciones'}
                                </Button>
                                {openTxSession === session.id && (
                                    <SessionTransactions session={session} />
                                )}
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ))}
        </Box>
    );
};
