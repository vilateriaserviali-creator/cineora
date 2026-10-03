// CINEORA Render entrypoint.
const fs = require("fs");
const path = require("path");
const express = require("express");
const socketIO = require("socket.io");
const BaseServer = socketIO.Server;

const profileSyncRouter = require("./profile-sync-router");
const originalExpressFactory = express;
const wrappedExpressFactory = function wrappedExpressFactory(...args) {
  const app = originalExpressFactory(...args);
  app.use(profileSyncRouter);
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
      const mediaFix = fs.readFileSync(path.join(path.dirname(filePath), "media-link-fix.js"), "utf8");
      const profileNav = fs.readFileSync(path.join(path.dirname(filePath), "profile-nav-inject.js"), "utf8");
      const injected = html
        .replace(/<\/body>/i, `<script id="cineora-media-link-fix">${mediaFix}</script><script id="cineora-profile-nav-inject">${profileNav}</script></body>`);
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

class RenderSocketServer extends BaseServer {
  constructor(httpServer, options = {}) {
    super(httpServer, {...options,transports:["websocket","polling"],allowUpgrades:true,pingInterval:25000,pingTimeout:60000,connectTimeout:60000,serveClient:true,addTrailingSlash:true,connectionStateRecovery:{maxDisconnectionDuration:2*60*1000,skipMiddlewares:true}});
  }
}
socketIO.Server = RenderSocketServer;
process.on("uncaughtException", err => console.error("[CINEORA] uncaughtException", err));
process.on("unhandledRejection", err => console.error("[CINEORA] unhandledRejection", err));
require("./server.js");
