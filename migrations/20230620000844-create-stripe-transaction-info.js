'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('stripe_transaction_info', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      webhook_event_id: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {msg: "Webhook Event ID is a required field"},
          notEmpty: {msg: "Webhook Event ID is a required field"}
        }
      },
      order_payment_info_reference_no:{
        type: DataTypes.UUID,
        allowNull: false,
        validate: {
          notNull: {msg: "Payment Info Reference is a required field"},
          notEmpty: {msg: "Payment Info Reference is a required field"}
        }
      },
      stripe_info_reference_no: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
          notNull: {msg: "Product amount is a required field"},
          notEmpty: {msg: "Product amount is a required field"}
        }
      },
      status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
    await queryInterface.dropTable('stripe_transaction_info');
  }
};