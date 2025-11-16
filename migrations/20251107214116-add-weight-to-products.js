'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('products', 'weight', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Product weight in ounces'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('products', 'weight');
  }
};
