import express from 'express';
const router = express.Router();

// Cargar controladores
const paymentsCtrlModule = await import('../controllers/paymentsController.js');
const { createServicePayment, createManualPayment } = paymentsCtrlModule;

// Opcional: reusar createAbono desde abonoController si quieres exponerlo por aquí
const abonoCtrlModule = await import('../controllers/abonoController.js');
const { createAbono } = abonoCtrlModule;

// Rutas:
// POST /api/payments/calculate  -> ya implementada en paymentCalculator.js (si la montaste en /api/payments)
// POST /api/payments/service   -> COBRARFACTURAS
// POST /api/payments/manual    -> REGISTRO MANUAL
// POST /api/payments/abono     -> REGISTRAR ABONOS (reusa abonoController)
router.post('/service', createServicePayment);
router.post('/manual', createManualPayment);
router.post('/abono', createAbono);

export default router;
