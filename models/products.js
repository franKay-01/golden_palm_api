'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Products extends Model {
    static associate({Categories, Orders}) {
      // this.belongsTo(Categories, {foreignKey: 'category_ref_no', as: 'categories'})
      this.belongsTo(Categories, { foreignKey: 'category_ref_no', targetKey: 'reference_no', as: 'categories' });

      // this.hasMany(Orders, {foreignKey: 'product_reference_no' , as: 'orders'})
    }

    toJSON(){
      return {...this.get(), id: undefined}
    }
  }
  Products.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Product name is a required field"},
        notEmpty: {msg: "Product name is a required field"}
      }
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Product description is a required field"},
        notEmpty: {msg: "Product description is a required field"}
      }
    },
    sku: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    category_ref_no: {
      type: DataTypes.UUID,
      allowNull: false
    },
    price: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Product price is a required field"},
        notEmpty: {msg: "Product price is a required field"}
      }
    },
    quantity: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Product quantity is a required field"},
        notEmpty: {msg: "Product quantity is a required field"}
      }
    },
    img_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
  }, {
    sequelize,
    tableName: 'products',
    modelName: 'Products',
  });
  return Products;
};