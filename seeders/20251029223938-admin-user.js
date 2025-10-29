'use strict';
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Hash the password
    const hashedPassword = await bcrypt.hash('', 10);

    // Get Admin role_id
    const [adminRole] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE role_name = 'Admin' LIMIT 1;`
    );

    if (!adminRole || adminRole.length === 0) {
      throw new Error('Admin role not found. Please run role-seeder first.');
    }

    const adminRoleId = adminRole[0].id;

    // Insert admin user
    await queryInterface.bulkInsert('users', [{
      first_name: 'Admin',
      last_name: 'User',
      username: 'admin',
      email: 'admin@goldenpalmapi.com',
      country: 'USA',
      password: hashedPassword,
      reference_no: uuidv4(),
      is_active: true,
      role_id: adminRoleId,
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', {
      username: 'admin'
    }, {});
  }
};
