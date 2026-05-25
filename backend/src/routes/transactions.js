import { Router } from 'express';
import { createTransaction, getTransactionsByDate, getClosingSummary, deleteTransaction, updateTransaction } from '../controllers/transactionController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = Router();

// Rutas para las transacciones
router.post('/transactions', protect, createTransaction);
router.get('/transactions', protect, getTransactionsByDate);
router.get('/summary', protect, getClosingSummary);

// Ruta de actualización
router.put('/transactions/:id', protect, authorize('admin'), updateTransaction);
router.patch('/transactions/:id', protect, authorize('admin'), updateTransaction);

// --- RUTA DE ELIMINACIÓN CORRECTA Y ÚNICA ---
// Usamos :transactionId porque así lo espera nuestro controlador
router.delete('/transactions/:transactionId', protect, authorize('admin'), deleteTransaction);

export default router;