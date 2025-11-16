'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CookingClass extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  CookingClass.init({
    class_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: { msg: "Class name is required" },
        notEmpty: { msg: "Class name is required" }
      }
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        notNull: { msg: "Class date is required" },
        isDate: { msg: "Valid date is required" }
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        notNull: { msg: "Class amount is required" },
        isDecimal: { msg: "Valid amount is required" }
      }
    },
    is_upcoming: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    class_images: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of image URLs from the cooking class',
      validate: {
        isValidImages(value) {
          if (value !== null && value !== undefined) {
            if (!Array.isArray(value)) {
              throw new Error('Class images must be an array');
            }
            if (!value.every(item => typeof item === 'string')) {
              throw new Error('All image URLs must be strings');
            }
          }
        }
      }
    }
  }, {
    sequelize,
    tableName: 'cooking_classes',
    modelName: 'CookingClass',
  });
  return CookingClass;
};