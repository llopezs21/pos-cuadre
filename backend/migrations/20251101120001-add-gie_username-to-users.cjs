'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE \`users\`
      ADD COLUMN \`gie_app_username\` VARCHAR(128) NULL DEFAULT NULL AFTER \`role\`;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE \`users\`
      DROP COLUMN \`gie_app_username\`;
    `);
  }
};
