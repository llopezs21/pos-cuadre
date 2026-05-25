import pool from '../db/database.js';
import { randomUUID } from 'crypto';

// --- NUEVA LÍNEA: cargar modelos CommonJS (para resolver payment_method por code) ---
const dbModule = await import('../../models/index.cjs');
const db = dbModule.default || dbModule;
const { PaymentMethodConfig, PaymentMethod } = db;

export const getConfigs = async (req, res) => {
  try {
    const configs = await PaymentMethodConfig.findAll({
      include: [{ model: PaymentMethod }]
    });
    return res.json(configs);
  } catch (err) {
    console.error('getConfigs error', err);
    return res.status(500).json({ message: err.message || 'Error obteniendo configuraciones' });
  }
};

export const createOrUpdateConfig = async (req, res) => {
  const { payment_method_id, user_id, username, commission_percentage, commission_fixed } = req.body;
  if (!payment_method_id || !username) {
    return res.status(400).json({ message: 'El ID del método y el username (responsable) son requeridos.' });
  }

  try {
    const [config, created] = await PaymentMethodConfig.findOrCreate({
      where: { payment_method_id },
      defaults: {
        payment_method_id,
        user_id: user_id || 1,
        username,
        commission_percentage: commission_percentage ?? 0,
        commission_fixed: commission_fixed ?? 0
      }
    });

    if (!created) {
      await config.update({
        username,
        commission_percentage: commission_percentage ?? config.commission_percentage,
        commission_fixed: commission_fixed ?? config.commission_fixed,
        user_id: user_id ?? config.user_id
      });
    }

    return res.status(created ? 201 : 200).json(config);
  } catch (err) {
    console.error('createOrUpdateConfig error', err);
    return res.status(500).json({ message: err.message || 'Error creando/actualizando configuración' });
  }
};