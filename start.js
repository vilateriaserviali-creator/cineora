// CINEORA Render entrypoint.
const fs = require("fs");
const express = require("express");
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

// The room UI had accumulated many late CSS overrides. Keep the original
// feature code, but apply one final, coherent room layer at response time.
const originalSendFile = express.response.sendFile;
express.response.sendFile = function patchedSendFile(filePath, options, callback) {
  if (typeof filePath === "string" && /(?:^|[\\/])index\.html$/i.test(filePath)) {
    fs.readFile(filePath, "utf8", (err, html) => {
      if (err) {
        if (typeof callback === "function") return callback(err);
        return this.status(500).send("CINEORA: не удалось загрузить страницу.");
      }

      const roomCss = `
<style id="cineora-final-room-cleanup">
html:has(.room-view.show),body:has(.room-view.show){background:#151219!important;color:#eee7f1!important}
.room-view.show{min-height:100vh!important;background:radial-gradient(circle at 72% 10%,#3b29451f,transparent 32%),#151219!important;color:#eee7f1!important}
.room-view.show .room-top{height:68px!important;padding:0 22px!important;background:#18141c!important;border-bottom:1px solid #ffffff12!important;position:sticky;top:0;z-index:40}
.room-view.show .room-brand{color:#f5edf7!important;font-size:25px!important}
.room-view.show .room-actions{gap:8px!important}
.room-view.show .room-code,.room-view.show .room-btn{background:#211b26!important;border:1px solid #4a3c50!important;color:#eee7f1!important}
.room-view.show .room-btn.primary{background:#b996c4!important;border-color:#b996c4!important;color:#211722!important}
.room-view.show .room-layout{width:min(1540px,calc(100% - 32px))!important;margin:16px auto 24px!important;display:grid!important;grid-template-columns:minmax(0,1fr) 350px!important;gap:16px!important;align-items:start!important}
.room-view.show .room-main{min-width:0!important}
.room-view.show .room-sidebar{min-width:0!important;max-height:calc(100vh - 100px)!important;overflow:auto!important;scrollbar-width:thin}
.room-view.show .player-card,.room-view.show .player-panel,.room-view.show .video-card{background:#19161d!important;border:1px solid #342b39!important;box-shadow:0 18px 50px #0005!important;border-radius:20px!important;overflow:hidden!important}
.room-view.show #playerWrap{background:#0b0a0d!important;border-radius:18px!important;overflow:hidden!important}
.room-view.show #universalPlayer,.room-view.show #emptyPlayer{background:#0b0a0d!important}
.room-view.show .empty-player{background:radial-gradient(circle at 50% 38%,#9c79aa22,transparent 32%),#0d0b10!important}
.room-view.show .side-card,.room-view.show .room-card,.room-view.show .chat-panel,.room-view.show .voice-card{background:#1d1921!important;border:1px solid #352b39!important;border-radius:18px!important;box-shadow:none!important;color:#eee7f1!important}
.room-view.show .participants-title-row{padding-bottom:8px!important}
.room-view.show .person-row{background:#251f29!important;border-color:#443649!important;color:#eee7f1!important}
.room-view.show .person-row:hover{background:#2b2430!important}
.room-view.show .chat-messages,#chatMessages{background:#151219!important}
.room-view.show .chat-input,.room-view.show textarea,.room-view.show input{background:#211b25!important;border-color:#493c50!important;color:#f3eaf5!important}
.room-view.show .chat-input::placeholder,.room-view.show input::placeholder{color:#9f92a4!important}
.room-view.show .status,.room-view.show .muted{color:#9f93a4!important}
.room-view.show .invite-card{background:linear-gradient(135deg,#261e2b,#211a25)!important;border-color:#49394f!important;color:#eee7f1!important}
.room-view.show .reaction-bar{background:#1c1820!important;border-color:#3b3040!important}
.room-view.show .reaction-bar button{background:#27212c!important;border-color:#46384b!important}
@media(max-width:1050px){.room-view.show .room-layout{grid-template-columns:minmax(0,1fr)!important}.room-view.show .room-sidebar{max-height:none!important;overflow:visible!important}}
@media(max-width:650px){.room-view.show .room-top{height:auto!important;min-height:62px!important;padding:9px 12px!important}.room-view.show .room-layout{width:calc(100% - 18px)!important;margin:9px auto 18px!important;gap:10px!important}.room-view.show .room-actions{gap:5px!important}.room-view.show .room-btn{padding:8px 10px!important;font-size:12px!important}.room-view.show .room-code{padding:8px 10px!important;font-size:11px!important}}
</style>`;

      const roomScript = `
<script id="cineora-final-room-network-fix">
(function(){
  function hardenSocket(){
    const s=window.socket;
    if(!s||!s.io||!s.io.opts)return false;
    s.io.opts.timeout=60000;
    s.io.opts.reconnection=true;
    s.io.opts.reconnectionAttempts=Infinity;
    s.io.opts.reconnectionDelay=1000;
    s.io.opts.reconnectionDelayMax=10000;
    s.io.opts.randomizationFactor=.25;
    s.io.opts.tryAllTransports=true;
    s.io.opts.transports=["websocket","polling"];
    if(!s.connected){try{s.connect()}catch(e){}}
    return true;
  }
  let tries=0;
  const timer=setInterval(()=>{if(hardenSocket()||++tries>30)clearInterval(timer)},1000);
  window.addEventListener("online",()=>{tries=0;hardenSocket()});
})();
</script>`;

      const patched = html.replace(/<\/head>/i, roomCss + "</head>").replace(/<\/body>/i, roomScript + "</body>");
      this.type("html");
      return this.send(patched);
    });
    return this;
  }
  return originalSendFile.call(this, filePath, options, callback);
};

process.on("uncaughtException", err => console.error("[CINEORA] uncaughtException", err));
process.on("unhandledRejection", err => console.error("[CINEORA] unhandledRejection", err));

require("./server.js");
