// CINEORA Render entrypoint.
// Keep the server entrypoint small: the room UI is styled by index.html,
// while Socket.IO is configured here before server.js is loaded.
const fs = require("fs");
const path = require("path");
const express = require("express");
const socketIO = require("socket.io");
const BaseServer = socketIO.Server;

// If a broken/minimal index.html ever reaches Render, restore the last known
// good room page before Express starts serving it.
const RESTORE_INDEX_URL = "https://raw.githubusercontent.com/vilateriaserviali-creator/cineora/aa69dcd727d820b4c6079bc3d8c9e55f1ac91a45/index.html";
const indexPath = path.join(__dirname, "index.html");

async function ensureHealthyIndex() {
  try {
    const current = fs.readFileSync(indexPath, "utf8");
    if (current.includes("<body") && current.includes("side-card") && current.includes("</body>")) return;
    console.warn("[CINEORA] index.html is incomplete; restoring known-good version...");
    const response = await fetch(RESTORE_INDEX_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const restored = await response.text();
    if (!restored.includes("<body") || !restored.includes("side-card")) throw new Error("restored index is incomplete");
    fs.writeFileSync(indexPath, restored, "utf8");
    console.log("[CINEORA] index.html restored successfully.");
  } catch (err) {
    console.error("[CINEORA] index restore failed:", err.message);
  }
}

// Render serves index.html directly through Express. Inject the existing room
// fixes plus the new compact sidebar layout before the page is sent.
const originalSendFile = express.response.sendFile;
express.response.sendFile = function patchedSendFile(filePath, ...args) {
  try {
    if (path.basename(String(filePath)) === "index.html") {
      const html = fs.readFileSync(filePath, "utf8");
      const cssPath = path.join(path.dirname(filePath), "room-fix.css");
      const panelCssPath = path.join(path.dirname(filePath), "room-panel-fix.css");
      const mediaPath = path.join(path.dirname(filePath), "media-link-fix.js");
      const css = fs.readFileSync(cssPath, "utf8");
      const panelCss = fs.readFileSync(panelCssPath, "utf8");
      const mediaFix = fs.readFileSync(mediaPath, "utf8");
      const injected = html
        .replace(/<\\/head>/i, `<style id="cineora-room-recovery-fix">${css}</style><style id="cineora-compact-panel-fix">${panelCss}</style></head>`)
        .replace(/<\\/body>/i, `<script id="cineora-media-link-fix">${mediaFix}</script></body>`);
      this.type("html");
      this.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      return this.send(injected);
    }
  } catch (err) {
    console.error("[CINEORA] room/media injection failed:", err.message);
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

ensureHealthyIndex().finally(() => require("./server.js"));
