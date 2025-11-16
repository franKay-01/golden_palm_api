'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop foreign key constraint if it exists
    await queryInterface.removeConstraint('orders', 'orders_user_reference_no_fkey').catch(() => {
      console.log('Foreign key constraint does not exist, skipping...');
    });

    // Change user_reference_no from UUID to STRING (email)
    await queryInterface.changeColumn('orders', 'user_reference_no', {
      type: Sequelize.STRING(255),
      allowNull: false
    });
  },

  async down(queryInterface, Sequelize) {
    // Note: Rollback is destructive - existing email data cannot be converted back to UUIDs
    // This will only work if the orders table is empty or you manually handle data migration

    await queryInterface.changeColumn('orders', 'user_reference_no', {
      type: Sequelize.UUID,
      allowNull: false
    });

    // Do NOT re-add foreign key constraint automatically
    // If you need to restore it, ensure all user_reference_no values are valid UUIDs first
  }
};
