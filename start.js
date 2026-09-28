// CINEORA Render entrypoint.
const fs = require("fs");
const path = require("path");
const express = require("express");
const socketIO = require("socket.io");
const BaseServer = socketIO.Server;
const EventEmitter = require("events");

const profileSyncRouter = require("./profile-sync-router");
const originalExpressFactory = express;
const wrappedExpressFactory = function wrappedExpressFactory(...args) {
  const app = originalExpressFactory(...args);
  app.use(profileSyncRouter);
  // Explicit routes guarantee that the new profile pages are served through
  // the injection layer even if server.js later enables express.static().
  app.get("/profile.html", (req,res)=>res.sendFile(path.join(__dirname,"profile.html")));
  app.get("/public-achievements.html", (req,res)=>res.sendFile(path.join(__dirname,"public-achievements.html")));
  return app;
};
Object.assign(wrappedExpressFactory, originalExpressFactory);
wrappedExpressFactory.response = originalExpressFactory.response;
wrappedExpressFactory.request = originalExpressFactory.request;
require.cache[require.resolve("express")].exports = wrappedExpressFactory;

const originalSendFile = express.response.sendFile;
express.response.sendFile = function patchedSendFile(filePath, ...args) {
  try {
    const baseName = path.basename(String(filePath));
    if (baseName === "index.html") {
      const html = fs.readFileSync(filePath, "utf8");
      const css = fs.readFileSync(path.join(path.dirname(filePath), "room-fix.css"), "utf8");
      const mediaFix = fs.readFileSync(path.join(path.dirname(filePath), "media-link-fix.js"), "utf8");
      const injected = html.replace(/<\/head>/i, `<style id="cineora-room-recovery-fix">${css}</style></head>`).replace(/<\/body>/i, `<script id="cineora-media-link-fix">${mediaFix}</script></body>`);
      this.type("html"); this.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      return this.send(injected);
    }
    if (baseName === "profile.html" || baseName === "public-achievements.html") {
      const html = fs.readFileSync(filePath, "utf8");
      const syncClient = fs.readFileSync(path.join(path.dirname(filePath), "profile-sync-client.js"), "utf8");
      const syncCss = fs.readFileSync(path.join(path.dirname(filePath), "profile-sync.css"), "utf8");
      const injected = html.replace(/<\/head>/i, `<style id="cineora-profile-sync-style">${syncCss}</style></head>`).replace(/<\/body>/i, `<script id="cineora-profile-sync">${syncClient}</script></body>`);
      this.type("html"); this.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      return this.send(injected);
    }
  } catch (err) { console.error("[CINEORA] page injection failed:", err.message); }
  return originalSendFile.apply(this, [filePath, ...args]);
};

/* Explicit participant sync only. No automatic currentTime correction. */
const originalEmitterOn = EventEmitter.prototype.on;
EventEmitter.prototype.on = function patchedEmitterOn(eventName, listener) {
  if (eventName === "sync" && this && this.id && this.data && this.data.roomId && typeof this.to === "function") {
    const socket = this;
    const explicitSyncHandler = function syncFromParticipant(payload = {}) {
      const playing = !!payload.playing;
      const position = Math.max(0, Number(payload.position) || 0);
      const serverTime = Date.now();
      socket.to(socket.data.roomId).emit("sync", { playing, position, serverTime, sourceId: socket.id, explicit: true });
      socket.to(socket.data.roomId).emit("sync-state", { playing, position, serverTime, sourceId: socket.id, explicit: true });
    };
    return originalEmitterOn.call(this, eventName, explicitSyncHandler);
  }
  return originalEmitterOn.call(this, eventName, listener);
};

class RenderSocketServer extends BaseServer {
  constructor(httpServer, options = {}) {
    super(httpServer, {...options,transports:["websocket","polling"],allowUpgrades:true,pingInterval:25000,pingTimeout:60000,connectTimeout:60000,serveClient:true,addTrailingSlash:true,connectionStateRecovery:{maxDisconnectionDuration:2*60*1000,skipMiddlewares:true}});
  }
}
socketIO.Server = RenderSocketServer;
process.on("uncaughtException", err => console.error("[CINEORA] uncaughtException", err));
process.on("unhandledRejection", err => console.error("[CINEORA] unhandledRejection", err));
require("./server.js");
