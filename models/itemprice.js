'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ShippingItemPrice extends Model {
    static associate(models) {
    }
    toJSON(){
      return {...this.get(), id: undefined}
    }
  }
  ShippingItemPrice.init({
    price: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Price is a required field"},
        notEmpty: {msg: "Price name is a required field"}
      }
    },
    percentage: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Percentage is a required field"},
        notEmpty: {msg: "Percentage name is a required field"}
      }
    }
  }, {
    sequelize,
    tableName: 'shipping_item_price',
    modelName: 'ShippingItemPrice',
  });
  return ShippingItemPrice;
};