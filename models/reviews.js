'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Reviews extends Model {
    static associate({Orders, Users, Products, CuratedBundles}) {
      this.belongsTo(Orders, { foreignKey: 'order_id', targetKey: 'reference_no', as: 'order' });
      this.belongsTo(Users, { foreignKey: 'user_id', targetKey: 'reference_no', as: 'user' });
      this.belongsTo(Products, { foreignKey: 'item_id', targetKey: 'sku', as: 'product', constraints: false });
      this.belongsTo(CuratedBundles, { foreignKey: 'item_id', targetKey: 'bundle_id', as: 'bundle', constraints: false });
    }

    toJSON(){
      return {...this.get()}
    }
  }
  Reviews.init({
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      validate: {
        notNull: {msg: "Order ID is required"},
        notEmpty: {msg: "Order ID is required"}
      }
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      validate: {
        notNull: {msg: "User ID is required"},
        notEmpty: {msg: "User ID is required"}
      }
    },
    item_type: {
      type: DataTypes.ENUM('product', 'bundle'),
      allowNull: false,
      validate: {
        notNull: {msg: "Item type is required"},
        isIn: {
          args: [['product', 'bundle']],
          msg: "Item type must be either 'product' or 'bundle'"
        }
      }
    },
    item_id: {
      type: DataTypes.UUID,
      allowNull: false,
      validate: {
        notNull: {msg: "Item ID is required"},
        notEmpty: {msg: "Item ID is required"}
      }
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: {msg: "Rating is required"},
        min: {
          args: [1],
          msg: "Rating must be at least 1"
        },
        max: {
          args: [5],
          msg: "Rating must not exceed 5"
        }
      }
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    tableName: 'reviews',
    modelName: 'Reviews',
  });
  return Reviews;
};