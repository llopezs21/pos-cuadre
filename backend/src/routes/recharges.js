import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { listRecharges, createRecharge } from '../controllers/rechargeController.js';

const router = express.Router();

router.get('/', protect, listRecharges);
router.post('/', protect, createRecharge);

export default router;
