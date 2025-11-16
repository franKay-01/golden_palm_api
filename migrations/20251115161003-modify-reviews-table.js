'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add user_email column
    await queryInterface.addColumn('reviews', 'user_email', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // Remove item_id column
    await queryInterface.removeColumn('reviews', 'item_id');

    // Remove user_id column
    await queryInterface.removeColumn('reviews', 'user_id');
  },

  async down (queryInterface, Sequelize) {
    // Restore user_id column
    await queryInterface.addColumn('reviews', 'user_id', {
      type: Sequelize.UUID,
      allowNull: true
    });

    // Restore item_id column
    await queryInterface.addColumn('reviews', 'item_id', {
      type: Sequelize.UUID,
      allowNull: false
    });

    // Remove user_email column
    await queryInterface.removeColumn('reviews', 'user_email');
  }
};
