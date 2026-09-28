// CINEORA Render entrypoint.
// Keep the server entrypoint small: the room UI is styled by index.html,
// while Socket.IO is configured here before server.js is loaded.
const fs = require("fs");
const path = require("path");
const express = require("express");
const socketIO = require("socket.io");
const BaseServer = socketIO.Server;
const EventEmitter = require("events");

// Cross-device profile/statistics API. Mounted here so server.js does not need
// to be rewritten and the legacy room/chat code remains untouched.
const profileSyncRouter = require("./profile-sync-router");
const originalExpressFactory = express;
const wrappedExpressFactory = function wrappedExpressFactory(...args) {
  const app = originalExpressFactory(...args);
  app.use(profileSyncRouter);
  return app;
};
Object.assign(wrappedExpressFactory, originalExpressFactory);
wrappedExpressFactory.response = originalExpressFactory.response;
wrappedExpressFactory.request = originalExpressFactory.request;
require.cache[require.resolve("express")].exports = wrappedExpressFactory;

// Render serves index.html directly through Express. Inject the room recovery
// stylesheet, media-link compatibility layer and profile sync client without
// touching the legacy UI source.
const originalSendFile = express.response.sendFile;
express.response.sendFile = function patchedSendFile(filePath, ...args) {
  try {
    const baseName = path.basename(String(filePath));
    if (baseName === "index.html") {
      const html = fs.readFileSync(filePath, "utf8");
      const cssPath = path.join(path.dirname(filePath), "room-fix.css");
      const mediaPath = path.join(path.dirname(filePath), "media-link-fix.js");
      const css = fs.readFileSync(cssPath, "utf8");
      const mediaFix = fs.readFileSync(mediaPath, "utf8");
      const injected = html
        .replace(/<\/head>/i, `<style id="cineora-room-recovery-fix">${css}</style></head>`)
        .replace(/<\/body>/i, `<script id="cineora-media-link-fix">${mediaFix}</script></body>`);
      this.type("html");
      this.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      return this.send(injected);
    }
    if (baseName === "profile.html") {
      const html = fs.readFileSync(filePath, "utf8");
      const syncPath = path.join(path.dirname(filePath), "profile-sync-client.js");
      const syncClient = fs.readFileSync(syncPath, "utf8");
      const injected = html.replace(/<\/body>/i, `<script id="cineora-profile-sync">${syncClient}</script></body>`);
      this.type("html");
      this.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      return this.send(injected);
    }
  } catch (err) {
    console.error("[CINEORA] page injection failed:", err.message);
  }
  return originalSendFile.apply(this, [filePath, ...args]);
};

/*
 * Playback sync safety fix.
 * The legacy server only accepted the `sync` event from the current host.
 * CINEORA's intended behaviour is that a participant explicitly pressing
 * the sync button can send that state to the room. Intercept the registration
 * of that one event and broadcast the explicit command to the other sockets.
 * No timer or automatic currentTime correction is introduced.
 */
const originalEmitterOn = EventEmitter.prototype.on;
EventEmitter.prototype.on = function patchedEmitterOn(eventName, listener) {
  if (eventName === "sync" && this && this.id && this.data && this.data.roomId && typeof this.to === "function") {
    const socket = this;
    const explicitSyncHandler = function syncFromParticipant(payload = {}) {
      const playing = !!payload.playing;
      const position = Math.max(0, Number(payload.position) || 0);
      const serverTime = Date.now();
      socket.to(socket.data.roomId).emit("sync", {
        playing,
        position,
        serverTime,
        sourceId: socket.id,
        explicit: true
      });
      socket.to(socket.data.roomId).emit("sync-state", {
        playing,
        position,
        serverTime,
        sourceId: socket.id,
        explicit: true
      });
    };
    return originalEmitterOn.call(this, eventName, explicitSyncHandler);
  }
  return originalEmitterOn.call(this, eventName, listener);
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
