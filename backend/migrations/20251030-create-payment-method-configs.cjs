'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('payment_method_configs', {
      id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      payment_method_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      username: { type: Sequelize.STRING(128), allowNull: true },
      account_number: { type: Sequelize.STRING(128), allowNull: true },
      commission_percentage: { type: Sequelize.DECIMAL(10,4), allowNull: true },
      commission_fixed: { type: Sequelize.DECIMAL(10,2), allowNull: true },
      is_default: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    });

    // índice único (no depende de payment_methods)
    try {
      await queryInterface.addIndex('payment_method_configs', ['payment_method_id', 'user_id'], { unique: true, name: 'uniq_payment_method_user' });
    } catch (err) {
      console.warn('No se pudo crear índice uniq_payment_method_user:', err.message || err);
    }

    // añadir FK solo si existe payment_methods
    try {
      const [results] = await queryInterface.sequelize.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'payment_methods';"
      );
      if (Array.isArray(results) && results.length > 0) {
        await queryInterface.addConstraint('payment_method_configs', {
          fields: ['payment_method_id'],
          type: 'foreign key',
          name: 'fk_pmconfigs_payment_method_id',
          references: { table: 'payment_methods', field: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        });
      }
    } catch (err) {
      console.warn('No se pudo añadir FK en payment_method_configs ahora:', err.message || err);
    }
  },

  down: async (queryInterface /*, Sequelize */) => {
    try { await queryInterface.removeConstraint('payment_method_configs', 'fk_pmconfigs_payment_method_id'); } catch (e) { /* ignore */ }
    try { await queryInterface.removeIndex('payment_method_configs', 'uniq_payment_method_user'); } catch (e) { /* ignore */ }
    await queryInterface.dropTable('payment_method_configs');
  }
};
