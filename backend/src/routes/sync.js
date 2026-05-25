import express from 'express';
import multer from 'multer';
import { uploadClients, uploadInvoices } from '../controllers/syncController.js';
import { protect } from '../middleware/authMiddleware.js'; // opcional: proteger rutas

const router = express.Router();
const upload = multer(); // memory storage

// POST /api/sync/clients  (file field: clientsFile)
router.post('/clients', protect, upload.single('clientsFile'), uploadClients);

// POST /api/sync/invoices  (file field: invoicesFile)
router.post('/invoices', protect, upload.single('invoicesFile'), uploadInvoices);

export default router;
