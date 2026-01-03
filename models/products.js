'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Products extends Model {
    static associate({Categories, OrderItems}) {
      this.belongsTo(Categories, { foreignKey: 'category_ref_no', targetKey: 'reference_no', as: 'categories' });
    }

    toJSON(){
      return {...this.get(), id: undefined}
    }
  }
  Products.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Product name is a required field"},
        notEmpty: {msg: "Product name is a required field"}
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notNull: {msg: "Product description is a required field"},
        notEmpty: {msg: "Product description is a required field"}
      }
    },
    sku: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    category_ref_no: {
      type: DataTypes.UUID,
      allowNull: false
    },
    price: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Product price is a required field"},
        notEmpty: {msg: "Product price is a required field"}
      }
    },
    quantity: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Product quantity is a required field"},
        notEmpty: {msg: "Product quantity is a required field"}
      }
    },
    img_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    highlights: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ref_color: {
      type: DataTypes.STRING,
      allowNull: true
    },
    metadata:{
      type: DataTypes.JSON,
      allowNull: true,
    },
    uses: {
      type: DataTypes.JSON,
      allowNull: true,
      validate: {
        isArrayOfStrings(value) {
          if (value !== null && value !== undefined) {
            if (!Array.isArray(value)) {
              throw new Error('Uses must be an array');
            }
            if (!value.every(item => typeof item === 'string')) {
              throw new Error('All uses items must be strings');
            }
          }
        }
      }
    },
    is_hot: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      defaultValue: false
    },
    is_discount:{
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    weight: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Product weight value'
    },
    weight_type: {
      type: DataTypes.ENUM('oz', 'lbs', 'g', 'kg', 'ml', 'l'),
      allowNull: true,
      defaultValue: 'oz',
      comment: 'Unit of measurement for product weight (oz, lbs, g, kg, ml, l)'
    },
    shipping_weight: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Shipping weight value (includes packaging)'
    },
    shipping_weight_type: {
      type: DataTypes.ENUM('oz', 'lbs', 'g', 'kg', 'ml', 'l'),
      allowNull: true,
      defaultValue: 'oz',
      comment: 'Unit of measurement for shipping weight'
    },
    has_variations: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether product has heat level variations'
    },
    variations: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Product variations with heat levels and images',
      validate: {
        isValidVariations(value) {
          if (value !== null && value !== undefined) {
            if (!Array.isArray(value)) {
              throw new Error('Variations must be an array');
            }
            if (!value.every(item => item.heat_level && item.img_url)) {
              throw new Error('Each variation must have heat_level and img_url');
            }
          }
        }
      }
    },
    additional_images: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of additional product image URLs',
      validate: {
        isArrayOfStrings(value) {
          if (value !== null && value !== undefined) {
            if (!Array.isArray(value)) {
              throw new Error('Additional images must be an array');
            }
            if (!value.every(item => typeof item === 'string')) {
              throw new Error('All additional image items must be strings');
            }
          }
        }
      }
    },
    ingredients: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Product ingredients information'
    }
  }, {
    sequelize,
    tableName: 'products',
    modelName: 'Products',
  });
  return Products;
};