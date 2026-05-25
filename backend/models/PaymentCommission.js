'use strict';
module.exports = (sequelize, DataTypes) => {
  const PaymentCommission = sequelize.define('PaymentCommission', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    transaction_id: { type: DataTypes.STRING(64), allowNull: false },
    payment_method_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    commission_amount: { type: DataTypes.DECIMAL(12,2), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true }
  }, {
    tableName: 'payment_commissions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    underscored: true
  });

  PaymentCommission.associate = function(models) {
    PaymentCommission.belongsTo(models.PaymentMethod, { foreignKey: 'payment_method_id' });
  };

  return PaymentCommission;
};
