'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('products', {
      id: {
        allowNull: false,
        autoIncrement: true,
        type: DataTypes.INTEGER
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      sku: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        unique: true
      },
      category_ref_no: {
        type: DataTypes.UUID,
        allowNull: false
      },
      price: {
        type: DataTypes.STRING,
        allowNull: false
      },
      discount_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0
      },
      quantity: {
        type: DataTypes.STRING,
        allowNull: false
      },
      img_url: {
        type: DataTypes.STRING,
        allowNull: true
      },
      highlights: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true
      },
      ref_color: {
        type: DataTypes.STRING,
        allowNull: true
      },
      uses: {
        type: DataTypes.JSON,
        allowNull: true
      },
      is_discount: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      is_hot: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        defaultValue: false
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE
      }
    });
  },
  async down(queryInterface, DataTypes) {
    await queryInterface.dropTable('products');
  }
};