'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Drop CartItems table
    await queryInterface.dropTable('cart_items');

    // Drop existing Carts table
    await queryInterface.dropTable('carts');

    // Recreate Carts table with new structure
    await queryInterface.createTable('carts', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      session_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'reference_no'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      cart_data: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: []
      },
      total_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
      },
      item_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true
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
    await queryInterface.addIndex('carts', ['session_id'], {
      name: 'idx_carts_session_id'
    });

    await queryInterface.addIndex('carts', ['user_id'], {
      name: 'idx_carts_user_id'
    });

    await queryInterface.addIndex('carts', ['expires_at'], {
      name: 'idx_carts_expires_at'
    });
  },

  async down (queryInterface, Sequelize) {
    // Drop new Carts table
    await queryInterface.dropTable('carts');

    // Recreate old structure
    await queryInterface.createTable('carts', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      session_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'reference_no'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true
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

    await queryInterface.createTable('cart_items', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      cart_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Carts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      product_sku: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      product_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      product_type: {
        type: Sequelize.ENUM('product', 'bundle'),
        allowNull: false
      },
      unit_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      heat_level: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      img_url: {
        type: Sequelize.STRING(500),
        allowNull: true
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
  }
};
