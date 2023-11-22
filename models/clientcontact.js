'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ClientContact extends Model {
    static associate(models) {
      // define association here
    }

    toJSON(){
      return {...this.get(), id: undefined}
    }
  }
  ClientContact.init({
    first_name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "First name is a required field"},
        notEmpty: {msg: "First name is a required field"}
      }
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Last name is a required field"},
        notEmpty: {msg: "Last name is a required field"}
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: {msg: "Invalid email format"},
        notNull: {msg: "Email is a required field"},
        notEmpty: {msg: "Email is a required field"}
      },
    },
    message: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Message is a required field"},
        notEmpty: {msg: "Message is a required field"}
      }
    },
  }, {
    sequelize,
    tableName: 'client_contacts',
    modelName: 'ClientContact',
  });
  return ClientContact;
};