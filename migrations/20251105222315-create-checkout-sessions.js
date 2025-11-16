'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('checkout_sessions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      stripe_session_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'Stripe checkout session ID'
      },
      stripe_customer_id: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Stripe customer ID'
      },
      cart_data: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Complete cart data with product_details for bundles'
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true
      },
      zipcode: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      shipping_address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      phone_number: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'expired', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      order_reference_no: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Reference to order created from this session'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes
    await queryInterface.addIndex('checkout_sessions', ['stripe_session_id'], {
      name: 'idx_checkout_sessions_stripe_session_id'
    });

    await queryInterface.addIndex('checkout_sessions', ['status'], {
      name: 'idx_checkout_sessions_status'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('checkout_sessions');
  }
};
