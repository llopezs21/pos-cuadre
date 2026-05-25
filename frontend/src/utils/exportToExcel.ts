import * as XLSX from 'xlsx';

export const exportSessionToExcel = (session: any, transactions: any[]) => {
    // 1. Hoja de Resumen (usando array de arrays)
    const summaryData = [
        [`Cierre de Caja - Sesión #${session.id}`],
        [`Cerrada por: ${session.username} el ${new Date(session.closedAt).toLocaleString()}`],
        [],
        ["RESUMEN DE CIERRE"],
        ["Método de Pago", "Sistema Esperado", "Usuario Contó", "Diferencia"],
        ["Efectivo USD ($)", session.system_totals?.cash_usd, session.closing_cash_usd, (session.closing_cash_usd || 0) - (session.system_totals?.cash_usd || 0)],
        ["Efectivo VES", session.system_totals?.cash_ves, session.closing_cash_ves, (session.closing_cash_ves || 0) - (session.system_totals?.cash_ves || 0)],
        ["Punto Banesco (VES)", session.system_totals?.pos_banesco, session.closing_pos_banesco_total, (session.closing_pos_banesco_total || 0) - (session.system_totals?.pos_banesco || 0)],
        ["Punto Mi Banco (VES)", session.system_totals?.pos_mibanco, session.closing_pos_mibanco_total, (session.closing_pos_mibanco_total || 0) - (session.system_totals?.pos_mibanco || 0)],
        [],
        ["Discrepancia Total (USD)", session.discrepancy],
        ["Total Reportado en Mikrowisp ($)", session.closing_mikrowisp_total],
    ];
    const ws_summary = XLSX.utils.aoa_to_sheet(summaryData);

    // 2. Hoja de Transacciones (usando array de arrays)
    const transactionsHeader = ["ID Transacción", "Cliente", "Tipo", "Monto Base USD", "Fecha", "Pagos"];
    const transactionsBody = transactions.map(tx => [
        tx.id,
        tx.clientName,
        tx.invoiceType,
        Number(tx.invoiceBaseUSD),
        new Date(tx.createdAt).toLocaleString(),
        (tx.payments || []).map((p: any) => `${p.method}: ${p.amount}`).join('; ')
    ]);
    const ws_transactions = XLSX.utils.aoa_to_sheet([transactionsHeader, ...transactionsBody]);

    // 3. Crear y descargar el archivo
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws_summary, "Resumen de Cierre");
    XLSX.utils.book_append_sheet(wb, ws_transactions, "Transacciones");
    XLSX.writeFile(wb, `Cierre_Sesion_${session.id}.xlsx`);
};
