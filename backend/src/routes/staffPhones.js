import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  listStaffPhones,
  createStaffPhone,
  deleteStaffPhone,
} from '../controllers/staffPhoneController.js';

const router = express.Router();

router.get('/', protect, listStaffPhones);
router.post('/', protect, authorize('admin'), createStaffPhone);
router.delete('/:id', protect, authorize('admin'), deleteStaffPhone);

export default router;
