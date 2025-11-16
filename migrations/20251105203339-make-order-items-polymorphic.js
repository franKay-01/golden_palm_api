'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add item_type column to distinguish between product and bundle
    await queryInterface.addColumn('order_items', 'item_type', {
      type: Sequelize.ENUM('product', 'bundle'),
      allowNull: false,
      defaultValue: 'product'
    });

    // Rename product_reference_no to item_reference_no for clarity
    await queryInterface.renameColumn('order_items', 'product_reference_no', 'item_reference_no');
  },

  async down(queryInterface, Sequelize) {
    // Revert column rename
    await queryInterface.renameColumn('order_items', 'item_reference_no', 'product_reference_no');

    // Remove item_type column
    await queryInterface.removeColumn('order_items', 'item_type');

    // Drop the enum type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_order_items_item_type";');
  }
};
