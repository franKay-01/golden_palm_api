'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {

  class StripeTransactionInfo extends Model {
   
    static associate({Orders}) {
      this.belongsTo(Orders, {foreignKey: 'order_reference_no', targetKey: 'reference_no' , as: 'order_payment_info'})
    }

    toJSON(){
      return {...this.get(), id: undefined}
    }
  }
  StripeTransactionInfo.init({
    webhook_event_id: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Webhook Event ID is a required field"},
        notEmpty: {msg: "Webhook Event ID is a required field"}
      }
    },
    order_reference_no:{
      type: DataTypes.UUID,
      allowNull: false,
      validate: {
        notNull: {msg: "Payment Info Reference is a required field"},
        notEmpty: {msg: "Payment Info Reference is a required field"}
      }
    },
    stripe_info_reference_no: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUID4
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        notNull: {msg: "Product amount is a required field"},
        notEmpty: {msg: "Product amount is a required field"}
      }
    },
    status: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    }
  }, {
    sequelize,
    tableName: 'stripe_transaction_info',
    modelName: 'StripeTransactionInfo',
  });
  return StripeTransactionInfo;
};