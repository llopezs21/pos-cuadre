import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * FASE 1: Rutas de Configuración Global
 * Todas las rutas están protegidas con autenticación
 */

// GET /api/settings - Obtener configuración global
router.get('/', protect, getSettings);

// PUT /api/settings - Actualizar configuración global
router.put('/', protect, updateSettings);

export default router;
