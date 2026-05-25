'use strict';
module.exports = (sequelize, DataTypes) => {
  const PaymentMethod = sequelize.define('PaymentMethod', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(128), allowNull: false },
    code: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    currency: { type: DataTypes.ENUM('USD', 'VES'), allowNull: false, defaultValue: 'USD' },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    requires_responsable: { type: DataTypes.BOOLEAN, defaultValue: false },
    generates_commission: { type: DataTypes.BOOLEAN, defaultValue: false },
    // FASE 1: Nuevas columnas para reglas de negocio dinámicas
    triggers_iva: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_base_currency: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, {
    tableName: 'payment_methods',
    timestamps: true,
    underscored: true
  });

  PaymentMethod.associate = function(models) {
    PaymentMethod.hasMany(models.PaymentMethodConfig, { foreignKey: 'payment_method_id' });
    PaymentMethod.hasMany(models.PaymentCommission, { foreignKey: 'payment_method_id' });
  };

  return PaymentMethod;
};
