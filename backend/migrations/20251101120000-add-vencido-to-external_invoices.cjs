'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Modifica la columna ENUM para añadir 'VENCIDO'.
     * Asegúrate de incluir TODOS los valores existentes + el nuevo.
     */
    await queryInterface.changeColumn('external_invoices', 'status', {
      type: Sequelize.ENUM('NO PAGADO', 'PAGADO', 'ANULADO', 'VENCIDO'),
      defaultValue: 'NO PAGADO',
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Volver al estado anterior (sin 'VENCIDO').
     * Esto podría fallar si hay datos 'VENCIDO' en la tabla.
     */
    await queryInterface.changeColumn('external_invoices', 'status', {
      type: Sequelize.ENUM('NO PAGADO', 'PAGADO', 'ANULADO'),
      defaultValue: 'NO PAGADO',
      allowNull: true
    });
  }
};
