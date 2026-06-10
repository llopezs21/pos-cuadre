export const calculateSummaryFromTransactions = (txs: any[]) => {
  const totalsByMethod = {
    totalCashUSD: 0,
    totalCashVES: 0,
    totalPosBanesco: 0,
    totalPosMiBanco: 0,
  };
  let totalMikrowispUSD = 0;
  let totalSupportInstallationUSD = 0;

  txs.forEach(tx => {
    if (tx.invoiceType === 'service') {
      totalMikrowispUSD += Number(tx.invoiceBaseUSD) || 0;
    } else {
      totalSupportInstallationUSD += Number(tx.invoiceBaseUSD) || 0;
    }

    (tx.payments || []).forEach((p: any) => {
      const amount = Number(p.amount) || 0;
      const method = (p.payment_method_code || p.method || '').toString().toUpperCase();

      switch (method) {
        case 'CASH_USD':
          totalsByMethod.totalCashUSD += amount;
          break;
        case 'CASH_VES':
          totalsByMethod.totalCashVES += amount;
          break;
        case 'POS_BANESCO':
          totalsByMethod.totalPosBanesco += amount;
          break;
        case 'POS_MIBANCO':
          totalsByMethod.totalPosMiBanco += amount;
          break;
        default:
          break;
      }
    });
  });

  return {
    totalsByMethod,
    totalsByCategory: { totalMikrowispUSD, totalSupportInstallationUSD },
    differences: [],
  };
};

/** Incorpora montos cobrados por recargas (no staff) a las métricas de sesión */
export const mergeRechargesIntoSummary = (summary: any, recharges: any[]) => {
  if (!recharges?.length) return summary;

  const base = summary ?? {
    totalsByMethod: {
      totalCashUSD: 0,
      totalCashVES: 0,
      totalPosBanesco: 0,
      totalPosMiBanco: 0,
    },
    totalsByCategory: { totalMikrowispUSD: 0, totalSupportInstallationUSD: 0 },
    differences: [],
  };

  const totals = { ...base.totalsByMethod };

  recharges.forEach((r) => {
    if (r.is_staff || !r.payment_method || r.amount_tendered == null) return;
    const amount = Number(r.amount_tendered) || 0;
    const method = String(r.payment_method).toUpperCase();
    switch (method) {
      case 'CASH_USD':
        totals.totalCashUSD += amount;
        break;
      case 'CASH_VES':
        totals.totalCashVES += amount;
        break;
      case 'POS_BANESCO':
        totals.totalPosBanesco += amount;
        break;
      case 'POS_MIBANCO':
        totals.totalPosMiBanco += amount;
        break;
      default:
        if (r.currency === 'USD') totals.totalCashUSD += amount;
        else if (r.currency === 'VES') totals.totalCashVES += amount;
        break;
    }
  });

  return { ...base, totalsByMethod: totals };
};
