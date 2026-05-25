import express from 'express';
const router = express.Router();

// Cargar servicio de cálculo
const calcModule = await import('../services/paymentCalculator.js');
const { calculatePayment } = calcModule;

router.post('/calculate', async (req, res) => {
  try {
    const payload = req.body;
    const result = await calculatePayment(payload);
    return res.json(result);
  } catch (err) {
    console.error('payment calculate error', err);
    return res.status(500).json({ message: 'Error calculando pago', error: err.message || err });
  }
});

export default router;
