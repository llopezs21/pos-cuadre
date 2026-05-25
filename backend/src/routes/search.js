import { Router } from 'express';
import { searchClients, getUnpaidInvoices } from '../controllers/searchController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.get('/clients', protect, searchClients);
router.get('/clients/:clientMksId/unpaid-invoices', protect, getUnpaidInvoices);

export default router;
