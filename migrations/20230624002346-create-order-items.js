'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('order_items', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      order_item_reference_no: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      order_reference_no: {
        type: DataTypes.UUID, 
        allowNull: false,
        validate: {
          notNull: {msg: "Product reference is a required field"},
          notEmpty: {msg: "Product reference is a required field"}
        }
      },
      product_reference_no: {
        type: DataTypes.UUID, 
        allowNull: false,
        validate: {
          notNull: {msg: "Product reference is a required field"},
          notEmpty: {msg: "Product reference is a required field"}
        }
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: {msg: "Product quantity is a required field"},
          notEmpty: {msg: "Product quantity is a required field"}
        }
      },
      unit_amount:{
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
          notNull: {msg: "Product amount is a required field"},
          notEmpty: {msg: "Product amount is a required field"}
        }
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE
      }
    });
  },
  async down(queryInterface, DataTypes) {
    await queryInterface.dropTable('order_items');
  }
};