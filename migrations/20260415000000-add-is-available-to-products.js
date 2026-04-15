'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('products', 'is_available', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Indicates if product is in stock'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('products', 'is_available');
  }
};
