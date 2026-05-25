'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('payments', 'payment_method_id', { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await queryInterface.addColumn('payments', 'payment_method_code', { type: Sequelize.STRING(64), allowNull: true });
    await queryInterface.addColumn('transactions', 'external_reference', { type: Sequelize.STRING(128), allowNull: true });
    await queryInterface.addColumn('cashier_sessions', 'can_reopen', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true });
  },
  down: async (queryInterface /*, Sequelize */) => {
    await queryInterface.removeColumn('payments', 'payment_method_id');
    await queryInterface.removeColumn('payments', 'payment_method_code');
    await queryInterface.removeColumn('transactions', 'external_reference');
    await queryInterface.removeColumn('cashier_sessions', 'can_reopen');
  }
};
