'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Roles extends Model {
    static associate({Users}) {
      // define association here
      this.hasMany(Users, {foreignKey: 'role_id'})
    }
  }
  Roles.init({
    role_name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Role name is a required field"},
        notEmpty: {msg: "Role name is a required field"}
      }
    },
    reference_no: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
  }, {
    sequelize,
    tableName: 'roles',
    modelName: 'Roles',
  });
  return Roles;
};