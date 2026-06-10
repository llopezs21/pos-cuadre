import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  listUsers,
  createUser,
  updateUser,
  deactivateUser,
} from '../controllers/userController.js';

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/', listUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deactivateUser);

export default router;
