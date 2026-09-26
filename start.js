// CINEORA Render entrypoint.
// Keep the server entrypoint small: the room UI is styled by index.html,
// while Socket.IO is configured here before server.js is loaded.
const fs = require("fs");
const path = require("path");
const express = require("express");
const socketIO = require("socket.io");
const BaseServer = socketIO.Server;

// Render serves index.html directly through Express. Inject the final room
// recovery stylesheet here so we do not keep stacking conflicting inline CSS
// blocks inside the large legacy index.html file.
const originalSendFile = express.response.sendFile;
express.response.sendFile = function patchedSendFile(filePath, ...args) {
  try {
    if (path.basename(String(filePath)) === "index.html") {
      const html = fs.readFileSync(filePath, "utf8");
      const cssPath = path.join(path.dirname(filePath), "room-fix.css");
      const css = fs.readFileSync(cssPath, "utf8");
      const injected = html.replace(/<\/head>/i, `<style id="cineora-room-recovery-fix">${css}</style></head>`);
      this.type("html");
      this.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      return this.send(injected);
    }
  } catch (err) {
    console.error("[CINEORA] room-fix injection failed:", err.message);
  }
  return originalSendFile.apply(this, [filePath, ...args]);
};

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
