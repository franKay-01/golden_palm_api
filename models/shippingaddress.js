'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ShippingAddress extends Model {
    static associate({Users, Orders}) {
      this.belongsTo(Users, {foreignKey: 'reference_no', as: 'users'})
    }
    
    toJSON(){
      return {...this.get(), id: undefined}
    }
  }

  ShippingAddress.init({
    street_name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Street name is a required field"},
        notEmpty: {msg: "Street name is a required field"}
      }
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "City name is a required field"},
        notEmpty: {msg: "City name is a required field"}
      }
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Country is a required field"},
        notEmpty: {msg: "Country is a required field"}
      }
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "State is a required field"},
        notEmpty: {msg: "State is a required field"}
      }
    },
    postal_code: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Postal code is a required field"},
        notEmpty: {msg: "Postal code is a required field"}
      }
    },
    address_sku: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    reference_no:{
      type: DataTypes.UUID,
      allowNull: false
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
  }, {
    sequelize,
    tableName: 'shipping_address',
    modelName: 'ShippingAddress',
  });
  return ShippingAddress;
};