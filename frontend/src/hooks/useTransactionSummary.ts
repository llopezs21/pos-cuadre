import { useMemo } from 'react';
import type { FullTransaction } from '../services/api';

interface TransactionSummary {
  totalTransacciones: number;
  totalMontoBase: number;
  totalCashUSD: number;
  totalCashVES: number;
  totalPosBanesco: number;
  totalPosMiBanco: number;
}

/**
 * Custom Hook: useTransactionSummary
 * 
 * Responsabilidad: Calcular todos los totales y resúmenes de transacciones
 * Seguridad: Convierte todos los valores a number con fallback a 0
 * 
 * @param transactions - Array de transacciones a procesar
 * @returns TransactionSummary - Objeto con todos los totales calculados
 */
export const useTransactionSummary = (transactions: FullTransaction[]): TransactionSummary => {
  return useMemo(() => {
    // Inicializar totales
    let totalMontoBase = 0;
    let totalCashUSD = 0;
    let totalCashVES = 0;
    let totalPosBanesco = 0;
    let totalPosMiBanco = 0;

    // Procesar cada transacción
    transactions.forEach(tx => {
      // Sumar monto base con seguridad de tipos
      const invoiceAmount = Number(tx.invoiceBaseUSD);
      const safeInvoiceAmount = Number.isFinite(invoiceAmount) ? invoiceAmount : 0;
      totalMontoBase += safeInvoiceAmount;

      // Procesar cada pago de la transacción
      if (Array.isArray(tx.payments) && tx.payments.length > 0) {
        tx.payments.forEach(payment => {
          // Convertir amount de forma segura
          const amount = Number(payment.amount);
          const safeAmount = Number.isFinite(amount) ? amount : 0;

          // Obtener el método de pago (puede estar en 'method' o 'payment_method_code')
          // Type assertion segura para manejar ambas propiedades
          const paymentAny = payment as any;
          // FIX: Normalizar a UPPERCASE para coincidir con el backend
          const paymentMethod = (paymentAny.payment_method_code || payment.method || '').toString().toUpperCase();

          // Sumar según el método de pago (comparar en UPPERCASE)
          switch (paymentMethod) {
            case 'CASH_USD':
              totalCashUSD += safeAmount;
              break;
            case 'CASH_VES':
              totalCashVES += safeAmount;
              break;
            case 'POS_BANESCO':
              totalPosBanesco += safeAmount;
              break;
            case 'POS_MIBANCO':
              totalPosMiBanco += safeAmount;
              break;
            default:
              // Método desconocido - silenciosamente ignorado
              break;
          }
        });
      }
    });

    return {
      totalTransacciones: transactions.length,
      totalMontoBase,
      totalCashUSD,
      totalCashVES,
      totalPosBanesco,
      totalPosMiBanco,
    };
  }, [transactions]);
};
