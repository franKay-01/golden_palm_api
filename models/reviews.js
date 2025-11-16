'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Reviews extends Model {
    static associate({Orders}) {
      this.belongsTo(Orders, { foreignKey: 'order_id', targetKey: 'reference_no', as: 'order' });
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
    user_email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: {msg: "Valid email is required"}
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