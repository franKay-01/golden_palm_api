'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('order_items', 'is_partial_bundle', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'True when this bundle order item shipped without all of its components'
    });

    await queryInterface.addColumn('order_items', 'unavailable_items', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Snapshot of bundle products that were unavailable at order time: [{sku, name}]'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('order_items', 'unavailable_items');
    await queryInterface.removeColumn('order_items', 'is_partial_bundle');
  }
};
