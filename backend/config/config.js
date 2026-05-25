'use strict';

const common = {
  dialect: 'mysql',
  logging: false,
  define: {
    underscored: true,
    timestamps: true
  }
};

const development = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || null,
  database: process.env.DB_NAME || 'pos_cuadre',
  host: process.env.DB_HOST || '127.0.0.1',
  ...common
};

const test = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || null,
  database: process.env.DB_NAME_TEST || 'pos_cuadre_test',
  host: process.env.DB_HOST || '127.0.0.1',
  ...common
};

const production = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  ...common
};

module.exports = { development, test, production };
