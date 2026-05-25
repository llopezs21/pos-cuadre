import express from 'express';
import { getConfigs, createOrUpdateConfig } from '../controllers/paymentConfigController.js';

const router = express.Router();

// GET  /api/payment-configs
// POST /api/payment-configs
router.route('/')
  .get(getConfigs)
  .post(createOrUpdateConfig);

export default router;
