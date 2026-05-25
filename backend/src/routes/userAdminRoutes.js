import express from 'express';
import { listUsers, updateUserGieUsername } from '../controllers/userAdminController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Solo admins
router.get('/', protect, authorize('admin'), listUsers);
router.put('/:id/gie-username', protect, authorize('admin'), updateUserGieUsername);

export default router;
