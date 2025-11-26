'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('products', 'additional_images', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Array of additional product image URLs'
    });

    await queryInterface.addColumn('products', 'ingredients', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Product ingredients information'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('products', 'additional_images');
    await queryInterface.removeColumn('products', 'ingredients');
  }
};
