'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('order_payment_infos', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      order_payment_info_reference_no: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUID4
      },
      order_reference_no: {
        type: DataTypes.UUID,
        allowNull: false,
        validate: {
          notNull: {msg: "Order Reference is a required field"},
          notEmpty: {msg: "Order Reference is a required field"}
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
    await queryInterface.dropTable('order_payment_infos');
  }
};