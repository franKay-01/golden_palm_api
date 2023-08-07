'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {

  class Order extends Model {
    static associate({Users, StripeTransactionInfo, OrderItems}) {
      this.belongsTo(Users, {foreignKey: 'user_reference_no', targetKey: 'reference_no', as: 'users'})
      this.hasOne(StripeTransactionInfo, {foreignKey: 'order_reference_no' , as: 'stripeTransaction'})
      this.hasMany(OrderItems, {foreignKey: 'order_reference_no' , as: 'orders'})
    }

    toJSON(){
      return {...this.get(), id: undefined}
    }
  }
  Order.init({
    user_reference_no : {
      type: DataTypes.UUID,
      allowNull: false,
      validate: {
        notNull: {msg: "User reference is a required field"},
        notEmpty: {msg: "User reference is a required field"}
      }
    },
    order_custom_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    reference_no: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
      primaryKey: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: {msg: "Product quantity is a required field"},
        notEmpty: {msg: "Product quantity is a required field"}
      }
    },
    amount:{
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        notNull: {msg: "Product amount is a required field"},
        notEmpty: {msg: "Product amount is a required field"}
      }
    },
    other_info:{
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    }
  }, {
    sequelize,
    tableName: 'orders',
    modelName: 'Orders',
  });
  return Order;
};