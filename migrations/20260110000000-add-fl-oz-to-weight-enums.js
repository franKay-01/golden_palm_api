'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add 'fl oz' to weight_type enum
    await queryInterface.sequelize.query(`
      ALTER TYPE enum_products_weight_type ADD VALUE IF NOT EXISTS 'fl oz';
    `);

    // Add 'fl oz' to shipping_weight_type enum
    await queryInterface.sequelize.query(`
      ALTER TYPE enum_products_shipping_weight_type ADD VALUE IF NOT EXISTS 'fl oz';
    `);
  },

  async down (queryInterface, Sequelize) {
    // Note: PostgreSQL does not support removing enum values directly.
    // To roll this back, you would need to:
    // 1. Create new enum types without 'fl oz'
    // 2. Alter columns to use the new types
    // 3. Drop the old enum types
    // This is complex, so we'll leave the enum values in place on rollback.
    console.log('WARNING: Rolling back enum additions is not supported. The "fl oz" values will remain in the enum types.');
  }
};
