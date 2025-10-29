'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CuratedBundles extends Model {
    static associate(models) {
      // define association here
    }

    toJSON(){
      return {...this.get(), id: undefined}
    }
  }
  CuratedBundles.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Bundle name is a required field"},
        notEmpty: {msg: "Bundle name is a required field"}
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    bundle_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    bundle_type: {
      type: DataTypes.STRING,
      allowNull: true
    },
    img_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        notNull: {msg: "Bundle price is a required field"},
        isDecimal: {msg: "Bundle price must be a valid decimal"}
      }
    },
    discount_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    products: {
      type: DataTypes.JSON,
      allowNull: false,
      validate: {
        notNull: {msg: "Products are required for a bundle"},
        isValidProducts(value) {
          if (!Array.isArray(value)) {
            throw new Error('Products must be an array');
          }
          if (value.length === 0) {
            throw new Error('Bundle must contain at least one product');
          }
          if (!value.every(item => typeof item === 'string' || (typeof item === 'object' && item.id))) {
            throw new Error('Each product must be a valid product ID or object with ID');
          }
        }
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    tableName: 'curated_bundles',
    modelName: 'CuratedBundles',
  });
  return CuratedBundles;
};