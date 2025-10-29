'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('curated_bundles', {
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
        allowNull: true
      },
      bundle_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        unique: true
      },
      img_url: {
        type: DataTypes.STRING,
        allowNull: true
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      discount_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0
      },
      products: {
        type: DataTypes.JSON,
        allowNull: false
      },
      bundle_type: {
        type: DataTypes.STRING,
        allowNull: true
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
    await queryInterface.dropTable('curated_bundles');
  }
};