'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('recipes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {msg: "Title is a required field"},
          notEmpty: {msg: "Title is a required field"}
        }
      },
      associated_image: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notNull: {msg: "Recipe Description is a required field"},
          notEmpty: {msg: "Recipe Description is a required field"}
        }
      },
      prep_info: {
        type: DataTypes.JSON,
        allowNull: false,
        validate: {
          notNull: {msg: "Prep Information is a required field"},
          notEmpty: {msg: "Prep Information is a required field"}
        }
      },
      preparation: {
        type: DataTypes.JSON,
        allowNull: false,
        validate: {
          notNull: {msg: "Preparation Information is a required field"},
          notEmpty: {msg: "Preparation Information is a required field"}
        }
      },
      ingredients: {
        type: DataTypes.JSON,
        allowNull: false,
        validate: {
          notNull: {msg: "Ingredient is a required field"},
          notEmpty: {msg: "Ingredient is a required field"}
        }
      },
      associated_products: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      is_active:{
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
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
    await queryInterface.dropTable('recipes');
  }
};