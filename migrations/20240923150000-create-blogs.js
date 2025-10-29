'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('blogs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        type: DataTypes.INTEGER
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      blog_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        unique: true
      },
      author: {
        type: DataTypes.STRING,
        allowNull: false
      },
      category: {
        type: DataTypes.STRING,
        allowNull: true
      },
      tags: {
        type: DataTypes.JSON,
        allowNull: true
      },
      img_url: {
        type: DataTypes.STRING,
        allowNull: true
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      meta_description: {
        type: DataTypes.STRING,
        allowNull: true
      },
      is_published: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      published_at: {
        type: DataTypes.DATE,
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
    await queryInterface.dropTable('blogs');
  }
};