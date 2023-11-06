'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SubscriptionEmails extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  SubscriptionEmails.init({
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Price is a required field"},
        notEmpty: {msg: "Price name is a required field"}
      }
    }
  }, {
    sequelize,
    tableName: 'subscription_emails',
    modelName: 'SubscriptionEmails',
  });
  return SubscriptionEmails;
};