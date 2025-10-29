'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Recipe extends Model {
    static associate(models) {
    }

    toJSON(){
      return {...this.get()}
    }
  }
  Recipe.init({
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Title is a required field"},
        notEmpty: {msg: "Title is a required field"}
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notNull: {msg: "Recipe Description is a required field"},
        notEmpty: {msg: "Recipe Description is a required field"}
      }
    },
    associated_image: {
      type: DataTypes.STRING,
      allowNull: false,
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
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    tableName: 'recipes',
    modelName: 'Recipes',
  });
  return Recipe;
};