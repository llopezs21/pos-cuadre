'use strict';
const path = require('path');
// Cargar .env (útil cuando ejecutas sequelize-cli localmente)
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const common = {
  dialect: 'mysql',
  logging: false,
  define: {
    underscored: true,
    timestamps: true
  }
};

// --- NUEVA LÓGICA: determinar puerto efectivo ---
const resolvedHost = process.env.DB_HOST || '127.0.0.1';
// Si estamos apuntando al servicio docker 'db', el puerto dentro de la red es 3306.
// Si ejecutas desde host y usas mapeo 3309:3306, deja DB_PORT=3309 en .env para conexiones desde host.
let resolvedPort;
if (resolvedHost === 'db' || resolvedHost === 'mysql_db') {
  // dentro de la red de docker el puerto del servicio mysql es 3306
  resolvedPort = 3306;
} else if (process.env.DB_PORT) {
  resolvedPort = Number(process.env.DB_PORT);
} else {
  resolvedPort = 3306;
}

const development = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || null,
  database: process.env.DB_NAME || 'pos_cuadre',
  host: resolvedHost,
  port: resolvedPort,
  ...common
};

const test = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || null,
  database: process.env.DB_NAME_TEST || 'pos_cuadre_test',
  host: resolvedHost,
  port: resolvedPort,
  ...common
};

const production = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: resolvedHost,
  port: resolvedPort,
  ...common
};

module.exports = { development, test, production };
