'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('orders', 'review_email_sent', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Tracks if review email has been sent for this order'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('orders', 'review_email_sent');
  }
};
