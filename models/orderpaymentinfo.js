'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {

  class OrderPaymentInfo extends Model {
    static associate({Orders, StripeTransactionInfo}) {
      this.belongsTo(Orders, {foreignKey: 'order_reference_no', targetKey: 'reference_no', as: 'orders'})
      // this.belongsTo(StripeTransactionInfo, {foreignKey: 'order_payment_info_reference_no', targetKey: 'payment_info_reference_no', as: 'stripe_transaction'})
    }

    toJSON(){
      return {...this.get(), id: undefined}
    }
  }

  OrderPaymentInfo.init({
    order_payment_info_reference_no: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUID4
    },
    order_reference_no: {
      type: DataTypes.UUID,
      allowNull: false,
      validate: {
        notNull: {msg: "Order Reference is a required field"},
        notEmpty: {msg: "Order Reference is a required field"}
      }
    },
    status: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    }
  }, {
    sequelize,
    tableName: 'order_payment_infos',
    modelName: 'OrderPaymentInfo',
  });
  return OrderPaymentInfo;
};