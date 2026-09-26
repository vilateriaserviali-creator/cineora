// CINEORA Render entrypoint.
// Keep the server entrypoint small: the room UI is styled by index.html,
// while Socket.IO is configured here before server.js is loaded.
const socketIO = require("socket.io");
const BaseServer = socketIO.Server;

class RenderSocketServer extends BaseServer {
  constructor(httpServer, options = {}) {
    super(httpServer, {
      ...options,
      transports: ["websocket", "polling"],
      allowUpgrades: true,
      pingInterval: 25000,
      pingTimeout: 60000,
      connectTimeout: 60000,
      serveClient: true,
      addTrailingSlash: true,
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true
      }
    });
  }
}

socketIO.Server = RenderSocketServer;

process.on("uncaughtException", err => console.error("[CINEORA] uncaughtException", err));
process.on("unhandledRejection", err => console.error("[CINEORA] unhandledRejection", err));

require("./server.js");
