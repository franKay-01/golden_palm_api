'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class OrderItems extends Model {
    static associate({Orders, Products, CuratedBundles}) {
      this.belongsTo(Orders, {foreignKey: 'order_reference_no', targetKey: 'reference_no', as: 'orders'})
      // No direct associations - we'll handle polymorphic manually
    }

    toJSON(){
      return {...this.get(), id: undefined}
    }
  }
  OrderItems.init({
    order_item_reference_no: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    order_reference_no: {
      type: DataTypes.UUID, 
      allowNull: false,
      validate: {
        notNull: {msg: "Product reference is a required field"},
        notEmpty: {msg: "Product reference is a required field"}
      }
    },
    item_reference_no: {
      type: DataTypes.UUID,
      allowNull: false,
      validate: {
        notNull: {msg: "Item reference is a required field"},
        notEmpty: {msg: "Item reference is a required field"}
      }
    },
    item_type: {
      type: DataTypes.ENUM('product', 'bundle'),
      allowNull: false,
      defaultValue: 'product'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: {msg: "Product quantity is a required field"},
        notEmpty: {msg: "Product quantity is a required field"}
      }
    },
    unit_amount:{
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        notNull: {msg: "Product amount is a required field"},
        notEmpty: {msg: "Product amount is a required field"}
      }
    },
    desc: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'Product'
    },
    heat_level: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'order_items',
    modelName: 'OrderItems',
  });
  return OrderItems;
};