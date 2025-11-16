'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('order_bundle_items', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      order_item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'order_items',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      product_sku: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: 'SKU of product included in bundle at time of purchase'
      },
      product_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      product_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Price of individual product at time of bundle purchase'
      },
      product_img_url: {
        type: Sequelize.STRING,
        allowNull: true
      },
      is_hot: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add index for faster lookups
    await queryInterface.addIndex('order_bundle_items', ['order_item_id'], {
      name: 'idx_order_bundle_items_order_item_id'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('order_bundle_items');
  }
};
