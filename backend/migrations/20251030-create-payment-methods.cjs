'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('payment_methods', {
      id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(128), allowNull: false },
      code: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      currency: { type: Sequelize.ENUM('USD', 'VES'), allowNull: false, defaultValue: 'USD' },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      requires_responsable: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      generates_commission: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    });
  },
  down: async (queryInterface /*, Sequelize */) => {
    await queryInterface.dropTable('payment_methods');
  }
};
