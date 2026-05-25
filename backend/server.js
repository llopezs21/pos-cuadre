import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import transactionRoutes from './src/routes/transactions.js';
import authRoutes from './src/routes/auth.js'; // <-- Añadir esta línea
import sessionRoutes from './src/routes/sessions.js'; // <-- Añadir esta línea
import syncRoutes from './src/routes/sync.js'; // <-- Añadir esta línea
import searchRoutes from './src/routes/search.js'; // <-- Nueva línea
import abonoRoutes from './src/routes/abonos.js'; // <-- Añadir esta línea
import paymentMethodsRouter from './src/routes/paymentMethods.js'; // <-- Nueva línea
import paymentsRouter from './src/routes/payments.js'; // <-- Nueva línea
import paymentCalcRouter from './src/routes/paymentCalculator.js'; // <-- Nueva línea
import bcvRoutes from './src/routes/bcvRoutes.js';
import paymentConfigRoutes from './src/routes/paymentConfigRoutes.js';
import userAdminRoutes from './src/routes/userAdminRoutes.js'; // <-- Nueva línea

// Configuración inicial
dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors()); // Permite peticiones desde el frontend
app.use(express.json()); // Permite a Express entender JSON en el body de las peticiones

// Rutas de la API
app.use('/api/auth', authRoutes); // <-- Añadir esta línea
app.use('/api/sessions', sessionRoutes); // <-- Añadir esta línea
app.use('/api/sync', syncRoutes); // <-- Añadir esta línea
app.use('/api/search', searchRoutes); // <-- Nueva línea
app.use('/api/abonos', abonoRoutes); // <-- Añadir esta línea
app.use('/api/payment-methods', paymentMethodsRouter); // <-- Nueva línea
app.use('/api/payments', paymentsRouter); // <-- Nueva línea
app.use('/api/payments', paymentCalcRouter); // /api/payments/calculate
app.use('/api/bcv', bcvRoutes); // <-- Nueva línea
app.use('/api/payment-configs', paymentConfigRoutes);
app.use('/api/admin/users', userAdminRoutes); // <-- Nueva línea
app.use('/api', transactionRoutes);


// Ruta de bienvenida
app.get('/', (req, res) => {
  res.send('🚀 API de Cuadre de Caja funcionando!');
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});

export default app;