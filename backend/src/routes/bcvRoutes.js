import express from 'express';
const router = express.Router();

const ctrl = await import('../controllers/bcvController.js');
const { getRateByDate, getRateFirstOfMonth, getLatestRate } = ctrl;

router.get('/by-date', getRateByDate);
router.get('/first-of-month', getRateFirstOfMonth);
router.get('/latest', getLatestRate);

export default router;
