import express from 'express';
const router = express.Router();

// Cargar controlador (ESM import dinámico para compatibilidad)
const ctrl = await import('../controllers/paymentMethodController.js');

router.get('/', ctrl.listPaymentMethods);
router.get('/:id', ctrl.getPaymentMethod);
router.post('/', ctrl.createPaymentMethod);
router.put('/:id', ctrl.updatePaymentMethod);
router.patch('/:id', ctrl.updatePaymentMethod);

export default router;