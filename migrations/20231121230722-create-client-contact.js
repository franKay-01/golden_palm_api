'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('client_contacts', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      first_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {msg: "First name is a required field"},
          notEmpty: {msg: "First name is a required field"}
        }
      },
      last_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {msg: "Last name is a required field"},
          notEmpty: {msg: "Last name is a required field"}
        }
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isEmail: {msg: "Invalid email format"},
          notNull: {msg: "Email is a required field"},
          notEmpty: {msg: "Email is a required field"}
        },
      },
      message: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {msg: "Message is a required field"},
          notEmpty: {msg: "Message is a required field"}
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
    await queryInterface.dropTable('client_contacts');
  }
};