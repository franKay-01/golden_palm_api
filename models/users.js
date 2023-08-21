'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Users extends Model {
    static associate({ShippingAddress, Roles, Orders}) {
      // define association here
      this.belongsTo(Roles, {foreignKey: 'role_id', as: 'roles'})
      this.hasOne(ShippingAddress, {foreignKey: 'reference_no' ,as: 'shipping'})
      this.hasMany(Orders, {foreignKey: 'user_reference_no' , as: 'orders'})
    }

    toJSON(){
      return {...this.get(), id: undefined, password: undefined}
    }
  }

  Users.init({
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
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        msg: 'Username must be unique',
      },
      validate: {
        notNull: {msg: "Username is a required field"},
        notEmpty: {msg: "Username is a required field"},
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        msg: 'Email must be unique',
      },
      validate: {
        notNull: {msg: "Email is a required field"},
        notEmpty: {msg: "Email is a required field"},
        isEmail: {msg: "Email format is in-correct"}
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
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    reference_no: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
      primaryKey: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    role_id: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'users',
    modelName: 'Users',
  });
  return Users;
};