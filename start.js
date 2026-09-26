// CINEORA Render entrypoint.
const socketIO = require("socket.io");
const BaseServer = socketIO.Server;

class RenderSocketServer extends BaseServer {
  constructor(httpServer, options = {}) {
    super(httpServer, {
      ...options,
      transports: ["polling", "websocket"],
      allowUpgrades: true,
      pingInterval: 25000,
      pingTimeout: 60000,
      connectTimeout: 60000,
      serveClient: true,
      addTrailingSlash: true
    });
  }
}

socketIO.Server = RenderSocketServer;

process.on("uncaughtException", err => console.error("[CINEORA] uncaughtException", err));
process.on("unhandledRejection", err => console.error("[CINEORA] unhandledRejection", err));

require("./server.js");
