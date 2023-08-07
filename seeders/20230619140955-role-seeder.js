'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('roles', [{
      role_name: 'Admin',
      reference_no: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    },{
      role_name: 'User',
      reference_no: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    }], {}); 
  },

  async down (queryInterface, Sequelize) {
   
    await queryInterface.bulkDelete('roles', null, {});
     
  }
};

