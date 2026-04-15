'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('curated_bundles', 'is_available', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Indicates if bundle is in stock'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('curated_bundles', 'is_available');
  }
};
