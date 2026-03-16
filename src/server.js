const { createGatewayServer, startGatewayServer } = require("./http/gateway");

if (require.main === module) {
  startGatewayServer();
}

module.exports = {
  createGatewayServer,
  startGatewayServer
};
