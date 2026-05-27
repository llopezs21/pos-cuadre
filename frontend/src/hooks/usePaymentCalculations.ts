import { useMemo } from 'react';
import { useAppStore } from '../store';
import { PaymentEntry } from '../components/payment/PaymentEntryModal';

/**
 * FASE 5: Hook custom para consolidar la lógica de cálculos de pagos
 * compartida entre InvoicePaymentForm, AbonoForm y ManualEntryForm.
 * 
 * Centraliza los cálculos de:
 * - Total pagado en USD
 * - Total de pagos en USD (para IVA)
 * - Aplicación de IVA
 * - Total con IVA
 * - Monto restante
 */

interface UsePaymentCalculationsParams {
  payments: PaymentEntry[];
  totalToPay: number;
}

interface UsePaymentCalculationsResult {
  totalPaidUSD: number;
  usdPaymentTotal: number;
  applyIVA: boolean;
  totalToPayWithIVA: number;
  remainingAmountInUSD: number;
  IVA_RATE: number;
  IVA_THRESHOLD: number;
}

export const usePaymentCalculations = ({
  payments,
  totalToPay
}: UsePaymentCalculationsParams): UsePaymentCalculationsResult => {
  const { bcvRate, globalSettings } = useAppStore();

  // Extraer valores dinámicos de reglas de negocio
  const IVA_RATE = globalSettings?.iva_rate ?? 0.16;
  const IVA_THRESHOLD = globalSettings?.iva_threshold ?? 0.5;

  // Calcular total pagado en USD (conversión de VES a USD)
  const totalPaidUSD = useMemo(() => {
    let total = 0;
    payments.forEach(p => {
      if (p.currency === 'USD') {
        total += p.amount;
      } else {
        const rate = p.bcvRate || Number(bcvRate) || 1;
        total += p.amount / rate;
      }
    });
    return total;
  }, [payments, bcvRate]);

  // Calcular total de pagos en USD directo (sin conversión)
  const usdPaymentTotal = useMemo(() => {
    return payments
      .filter(p => p.currency === 'USD')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  // Determinar si aplica IVA
  const applyIVA = useMemo(() => {
    if (totalToPay === 0) return false;
    return (usdPaymentTotal / totalToPay) < IVA_THRESHOLD;
  }, [usdPaymentTotal, totalToPay, IVA_THRESHOLD]);

  // Calcular total con IVA
  const totalToPayWithIVA = useMemo(() => {
    if (!applyIVA) return totalToPay;
    const vesPortionBase = Math.max(0, totalToPay - usdPaymentTotal);
    const ivaOnVesPortion = vesPortionBase * IVA_RATE;
    return totalToPay + ivaOnVesPortion;
  }, [totalToPay, usdPaymentTotal, applyIVA, IVA_RATE]);

  // Calcular monto restante
  const remainingAmountInUSD = Number((totalToPayWithIVA - totalPaidUSD).toFixed(2));

  return {
    totalPaidUSD,
    usdPaymentTotal,
    applyIVA,
    totalToPayWithIVA,
    remainingAmountInUSD,
    IVA_RATE,
    IVA_THRESHOLD
  };
};
