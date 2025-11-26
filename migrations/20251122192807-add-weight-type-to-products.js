'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('products', 'weight_type', {
      type: Sequelize.ENUM('oz', 'lbs', 'g', 'kg', 'ml', 'l'),
      allowNull: true,
      defaultValue: 'oz',
      comment: 'Unit of measurement for product weight'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('products', 'weight_type');
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS enum_products_weight_type;`);
  }
};
