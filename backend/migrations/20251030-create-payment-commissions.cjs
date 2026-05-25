'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('payment_commissions', {
      id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      transaction_id: { type: Sequelize.STRING(64), allowNull: false },
      payment_method_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      commission_amount: { type: Sequelize.DECIMAL(12,2), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    try {
      const [results] = await queryInterface.sequelize.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'payment_methods';"
      );
      if (Array.isArray(results) && results.length > 0) {
        await queryInterface.addConstraint('payment_commissions', {
          fields: ['payment_method_id'],
          type: 'foreign key',
          name: 'fk_payment_commissions_payment_method_id',
          references: { table: 'payment_methods', field: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        });
      }
    } catch (err) {
      console.warn('No se pudo añadir la constraint FK en payment_commissions:', err.message || err);
    }
  },

  down: async (queryInterface /*, Sequelize */) => {
    try { await queryInterface.removeConstraint('payment_commissions', 'fk_payment_commissions_payment_method_id'); } catch (e) { /* ignore */ }
    await queryInterface.dropTable('payment_commissions');
  }
};