const http = require('http');
const app = require("./app");
const { sequelize } = require('./models')

const PORT = process.env.PORT || 5001;
const server = http.createServer(app);

server.listen({port: PORT}, async(req,res) => {
  console.log(`Server running on PORT ${PORT}`)
  // await sequelize.sync({ force: true});
  await sequelize.authenticate();
  console.log("DB Synced")
});

