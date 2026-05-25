import { Router } from 'express';
import { createAbono, getAvailableAbonos } from '../controllers/abonoController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.post('/', protect, createAbono);
router.get('/client/:clientMksId/available', protect, getAvailableAbonos);

export default router;
