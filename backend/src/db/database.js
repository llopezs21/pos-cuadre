import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Creamos un pool de conexiones para reutilizarlas
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000 // 10 segundos de timeout para conexión
});

// Nota: La inicialización y verificación de conexión se maneja en src/db/init.js

export default pool;