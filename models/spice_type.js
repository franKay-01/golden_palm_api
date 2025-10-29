'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SpiceType extends Model {
    static associate(models) {
      // define association here
    }

    toJSON(){
      return {...this.get(), id: undefined}
    }
  }
  SpiceType.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Spice type name is a required field"},
        notEmpty: {msg: "Spice type name is a required field"}
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    spice_type_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    tableName: 'spice_types',
    modelName: 'SpiceType',
  });
  return SpiceType;
};