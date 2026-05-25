'use strict';
module.exports = (sequelize, DataTypes) => {
  const PaymentMethodConfig = sequelize.define('PaymentMethodConfig', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    payment_method_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    username: { type: DataTypes.STRING(128), allowNull: true },
    account_number: { type: DataTypes.STRING(128), allowNull: true },
    commission_percentage: { type: DataTypes.DECIMAL(10,4), allowNull: true },
    commission_fixed: { type: DataTypes.DECIMAL(10,2), allowNull: true },
    is_default: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, {
    tableName: 'payment_method_configs',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['payment_method_id', 'user_id'] }
    ]
  });

  PaymentMethodConfig.associate = function(models) {
    PaymentMethodConfig.belongsTo(models.PaymentMethod, { foreignKey: 'payment_method_id' });
  };

  return PaymentMethodConfig;
};
