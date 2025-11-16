'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('cooking_classes', 'class_images', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Array of image URLs from the cooking class'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('cooking_classes', 'class_images');
  }
};
