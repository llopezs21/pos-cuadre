import { Router } from 'express';
import { register, login, getCurrentUser } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.post('/register', register);
router.post('/login', login);
// FASE 2: Ruta protegida para obtener el usuario actual
router.get('/me', protect, getCurrentUser);

export default router;