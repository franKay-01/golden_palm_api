'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CheckoutSessions extends Model {
    static associate(models) {
      // define association here
    }

    toJSON(){
      return {...this.get(), id: undefined}
    }
  }
  CheckoutSessions.init({
    stripe_session_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    stripe_customer_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cart_data: {
      type: DataTypes.JSON,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    zipcode: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    shipping_address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    phone_number: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'expired', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    order_reference_no: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'checkout_sessions',
    modelName: 'CheckoutSessions',
  });
  return CheckoutSessions;
};
