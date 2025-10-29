'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CartItems extends Model {
    static associate({Carts}) {
      this.belongsTo(Carts, { foreignKey: 'cart_id', as: 'cart' });
    }

    toJSON(){
      return {...this.get()}
    }
  }
  CartItems.init({
    cart_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: {msg: "Cart ID is required"}
      }
    },
    product_sku: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notNull: {msg: "Product SKU is required"},
        notEmpty: {msg: "Product SKU is required"}
      }
    },
    product_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notNull: {msg: "Product name is required"},
        notEmpty: {msg: "Product name is required"}
      }
    },
    product_type: {
      type: DataTypes.ENUM('product', 'bundle'),
      allowNull: false,
      validate: {
        notNull: {msg: "Product type is required"},
        isIn: {
          args: [['product', 'bundle']],
          msg: "Product type must be either 'product' or 'bundle'"
        }
      }
    },
    unit_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        notNull: {msg: "Unit price is required"},
        min: {
          args: [0],
          msg: "Unit price must be positive"
        }
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: {msg: "Quantity is required"},
        min: {
          args: [1],
          msg: "Quantity must be at least 1"
        }
      }
    },
    heat_level: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    img_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'cart_items',
    modelName: 'CartItems',
  });
  return CartItems;
};