'use strict';
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(path.resolve(__dirname, '..', 'config', 'config.cjs'))[env];

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect || 'mysql',
  logging: config.logging || false,
  define: config.define || {}
});

const db = {};

// Cargar modelos .js (CommonJS) en este directorio
fs.readdirSync(__dirname)
  .filter(file => file !== basename && file.endsWith('.js'))
  .forEach(file => {
    const modelPath = path.join(__dirname, file);
    // Cada archivo debe exportar: module.exports = (sequelize, DataTypes) => { ... }
    const modelFactory = require(modelPath);
    const model = modelFactory(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// Asociaciones
Object.keys(db).forEach(modelName => {
  if (typeof db[modelName].associate === 'function') {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;