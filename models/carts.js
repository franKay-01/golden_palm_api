'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Carts extends Model {
    static associate({Users}) {
      this.belongsTo(Users, { foreignKey: 'user_id', targetKey: 'reference_no', as: 'user' });
    }

    toJSON(){
      return {...this.get()}
    }
  }
  Carts.init({
    session_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        notNull: {msg: "Session ID is required"},
        notEmpty: {msg: "Session ID is required"}
      }
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    cart_data: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      validate: {
        isValidCartData(value) {
          if (!Array.isArray(value)) {
            throw new Error('Cart data must be an array');
          }
        }
      }
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00
    },
    item_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'carts',
    modelName: 'Carts',
  });
  return Carts;
};