'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('password_token', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {msg: "Username is a required field"},
          notEmpty: {msg: "Username is a required field"}
        }
      },
      user_token: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {msg: "Token is a required field"},
          notEmpty: {msg: "Token is a required field"}
        }
      },
      is_used: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      timed_expired: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      token_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
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
    await queryInterface.dropTable('password_token');
  }
};