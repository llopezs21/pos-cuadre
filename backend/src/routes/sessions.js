import { Router } from 'express';
import { getCurrentSession, startSession, closeSession, getAllClosedSessions, getTransactionsForSession } from '../controllers/sessionController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = Router();

// La ruta para que admin liste sesiones cerradas
router.get('/', protect, authorize('admin'), getAllClosedSessions);

// Historial (también para admin)
router.get('/history', protect, authorize('admin'), getAllClosedSessions);

router.get('/current', protect, getCurrentSession);
router.post('/start', protect, startSession);
router.post('/close', protect, closeSession);

// CORRECCIÓN: permitir a usuario autenticado obtener transacciones de UNA sesión
// Antes: router.get('/:sessionId/transactions', protect, authorize('admin'), getTransactionsForSession);
// Ahora: sólo protección de autenticación; el controller debe validar ownership si es necesario.
router.get('/:sessionId/transactions', protect, getTransactionsForSession);

export default router;