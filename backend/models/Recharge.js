'use strict';
module.exports = (sequelize, DataTypes) => {
  const Recharge = sequelize.define('Recharge', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    session_id: { type: DataTypes.INTEGER, allowNull: false },
    phone_number: { type: DataTypes.STRING(20), allowNull: false },
    is_staff: { type: DataTypes.BOOLEAN, defaultValue: false },
    net_amount_bs: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    commission_amount_bs: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    total_charged: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    payment_method: { type: DataTypes.STRING(64), allowNull: true },
    currency: { type: DataTypes.ENUM('USD', 'VES'), allowNull: true },
    amount_tendered: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    exchange_rate: { type: DataTypes.DECIMAL(10, 4), allowNull: true }
  }, {
    tableName: 'recharges',
    timestamps: true,
    updatedAt: false,
    createdAt: 'created_at',
    underscored: true
  });

  return Recharge;
};
