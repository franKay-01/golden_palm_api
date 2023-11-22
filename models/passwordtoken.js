'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PasswordToken extends Model {
    static associate(models) {
      // define association here
    }

    toJSON(){
      return {...this.get(), id: undefined}
    }
  }
  PasswordToken.init({
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Username is a required field"},
        notEmpty: {msg: "Username is a required field"}
      }
    },
    user_token: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Token is a required field"},
        notEmpty: {msg: "Token is a required field"}
      }
    },
    is_used: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    timed_expired: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    token_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: {msg: "Token Count is a required field"},
        notEmpty: {msg: "Token Count is a required field"}
      }
    },
  }, {
    sequelize,
    tableName: 'password_token',
    modelName: 'PasswordToken',
  });
  return PasswordToken;
};