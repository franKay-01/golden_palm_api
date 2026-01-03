'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('products', 'shipping_weight', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Shipping weight value (includes packaging)'
    });

    await queryInterface.addColumn('products', 'shipping_weight_type', {
      type: Sequelize.ENUM('oz', 'lbs', 'g', 'kg', 'ml', 'l'),
      allowNull: true,
      defaultValue: 'oz',
      comment: 'Unit of measurement for shipping weight'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('products', 'shipping_weight');
    await queryInterface.removeColumn('products', 'shipping_weight_type');
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS enum_products_shipping_weight_type;`);
  }
};
