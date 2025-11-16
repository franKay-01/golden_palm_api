'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('products', 'has_variations', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether product has heat level variations'
    });

    await queryInterface.addColumn('products', 'variations', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Product variations with heat levels and images: [{heat_level: "mild", img_url: "/path"}]'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('products', 'has_variations');
    await queryInterface.removeColumn('products', 'variations');
  }
};
