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
.room-view.show .room-sidebar{min-width:0!important;max-height:none!important;height:auto!important;overflow:visible!important;display:flex!important;flex-direction:column!important;gap:12px!important}
.room-view.show .player-card,.room-view.show .player-panel,.room-view.show .video-card{background:#19161d!important;border:1px solid #342b39!important;box-shadow:0 18px 50px #0005!important;border-radius:20px!important;overflow:hidden!important}
.room-view.show #playerWrap{background:#0b0a0d!important;border-radius:18px!important;overflow:hidden!important;min-height:420px!important}
.room-view.show #universalPlayer,.room-view.show #emptyPlayer{background:#0b0a0d!important}
.room-view.show .empty-player{background:radial-gradient(circle at 50% 38%,#9c79aa22,transparent 32%),#0d0b10!important}
.room-view.show .side-card,.room-view.show .room-card,.room-view.show .chat-panel,.room-view.show .voice-card{background:#1d1921!important;border:1px solid #352b39!important;border-radius:18px!important;box-shadow:none!important;color:#eee7f1!important}
.room-view.show .participants-title-row{padding-bottom:8px!important}
.room-view.show .person-row{background:#251f29!important;border-color:#443649!important;color:#eee7f1!important}
.room-view.show .person-row:hover{background:#2b2430!important}
.room-view.show .chat-panel{display:flex!important;flex-direction:column!important;min-height:390px!important;overflow:hidden!important}
.room-view.show .chat-panel h2,.room-view.show .chat-panel h3{flex:0 0 auto!important}
.room-view.show .chat-messages,#chatMessages{background:#151219!important;min-height:230px!important;height:230px!important;max-height:300px!important;overflow-y:auto!important;overflow-x:hidden!important;display:flex!important;flex-direction:column!important;gap:8px!important;padding:12px!important;box-sizing:border-box!important;scroll-behavior:smooth!important}
.room-view.show .chat-input,.room-view.show .chat-input-row{flex:0 0 auto!important;display:flex!important;align-items:center!important;gap:8px!important;padding:10px!important;background:#1d1921!important;border-top:1px solid #352b39!important}
.room-view.show .chat-input input,.room-view.show .chat-input-row input,.room-view.show .chat-input-row textarea{min-width:0!important;flex:1 1 auto!important;background:#211b25!important;border:1px solid #493c50!important;color:#f3eaf5!important;border-radius:12px!important}
.room-view.show .chat-input button,.room-view.show .chat-input-row button{flex:0 0 auto!important}
.room-view.show textarea,.room-view.show input{background:#211b25!important;border-color:#493c50!important;color:#f3eaf5!important}
.room-view.show .chat-input::placeholder,.room-view.show input::placeholder{color:#9f92a4!important}
.room-view.show .status,.room-view.show .muted{color:#9f93a4!important}
.room-view.show .invite-card{background:linear-gradient(135deg,#261e2b,#211a25)!important;border-color:#49394f!important;color:#eee7f1!important}
.room-view.show .reaction-bar{background:#1c1820!important;border-color:#3b3040!important}
.room-view.show .reaction-bar button{background:#27212c!important;border-color:#46384b!important}
.cineora-vk-fallback{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;min-height:420px;padding:30px;text-align:center;background:radial-gradient(circle at 50% 35%,#9c79aa22,transparent 34%),#0d0b10;color:#eee7f1;box-sizing:border-box}
.cineora-vk-fallback .vk-icon{font-size:42px}.cineora-vk-fallback strong{font-size:18px}.cineora-vk-fallback span{max-width:520px;color:#aaa0ad;font-size:13px;line-height:1.55}.cineora-vk-fallback a{display:inline-flex;align-items:center;justify-content:center;padding:11px 18px;border-radius:999px;background:#b996c4;color:#211722;text-decoration:none;font-weight:700}
.cineora-vk-fallback small{color:#7f7483}
@media(max-width:1050px){.room-view.show .room-layout{grid-template-columns:minmax(0,1fr)!important}.room-view.show .room-sidebar{max-height:none!important;overflow:visible!important}}
@media(max-width:650px){.room-view.show .room-top{height:auto!important;min-height:62px!important;padding:9px 12px!important}.room-view.show .room-layout{width:calc(100% - 18px)!important;margin:9px auto 18px!important;gap:10px!important}.room-view.show .room-actions{gap:5px!important}.room-view.show .room-btn{padding:8px 10px!important;font-size:12px!important}.room-view.show .room-code{padding:8px 10px!important;font-size:11px!important}.room-view.show #playerWrap{min-height:240px!important}.room-view.show .chat-panel{min-height:350px!important}.room-view.show .chat-messages,#chatMessages{height:200px!important;min-height:200px!important}}
</style>`;

      const roomScript = `
<script id="cineora-final-room-fix">
(function(){
  function roomId(){
    try{return new URLSearchParams(location.search).get("room")||""}catch(e){return ""}
  }
  function privateRoom(){
    try{return new URLSearchParams(location.search).get("private")||"0"}catch(e){return "0"}
  }
  function fixInvite(){
    const id=roomId(); if(!id)return;
    const href=location.origin+"/?room="+encodeURIComponent(id)+"&private="+encodeURIComponent(privateRoom());
    document.querySelectorAll(".room-view.show a,.room-view.show button").forEach(el=>{
      const text=(el.textContent||"").trim();
      if(text.includes("cineora.../?room=—")||text.includes("cineora...?room=—")||text.includes("Присоединяйтесь к просмотру")){
        if(el.tagName==="A") el.href=href;
        const code=el.querySelector(".room-invite-url,.invite-url");
        if(code) code.textContent=href;
      }
    });
    document.querySelectorAll(".room-view.show [data-room-link],.room-view.show .invite-url,.room-view.show .room-invite-url").forEach(el=>{el.textContent=href;if(el.tagName==="A")el.href=href});
  }
  function fixChat(){
    const root=document.querySelector(".room-view.show"); if(!root)return;
    const side=root.querySelector(".room-sidebar");
    if(side){side.style.maxHeight="none";side.style.height="auto";side.style.overflow="visible"}
    const chat=root.querySelector(".chat-panel");
    if(chat){chat.style.minHeight="390px";chat.style.overflow="hidden"}
    const messages=root.querySelector("#chatMessages,.chat-messages");
    if(messages){messages.style.height="230px";messages.style.minHeight="230px";messages.style.maxHeight="300px";messages.style.overflowY="auto";messages.scrollTop=messages.scrollHeight}
  }
  function addVkFallback(frame){
    if(!frame||frame.dataset.cineoraFallback)return;
    frame.dataset.cineoraFallback="1";
    const source=(frame.src||"").toLowerCase();
    const isVk=source.includes("vk.com")||source.includes("vkvideo.ru")||source.includes("vkvideo");
    if(!isVk)return;
    let loaded=false;
    const mark=()=>{loaded=true;frame.dataset.vkLoaded="1"};
    frame.addEventListener("load",mark,{once:true});
    setTimeout(()=>{
      if(loaded)return;
      const wrap=frame.parentElement||frame;
      const input=document.querySelector('.room-view.show input[type="url"],.room-view.show input[type="text"]');
      const original=input&&/^https?:\\/\\//.test(input.value)?input.value:frame.src;
      const box=document.createElement("div");
      box.className="cineora-vk-fallback";
      box.innerHTML='<div class="vk-icon">▶</div><strong>VK Video сейчас не отвечает</strong><span>CINEORA и комната работают. Внешний VK-плеер не загрузился вовремя, поэтому мы убрали битое серое окно.</span><a target="_blank" rel="noopener" href="'+String(original).replace(/"/g,"&quot;")+'">Открыть видео в VK</a><small>После восстановления VK можно снова нажать «Загрузить».</small>';
      frame.style.display="none";
      wrap.appendChild(box);
    },7000);
  }
  function fixVideo(){
    const root=document.querySelector(".room-view.show"); if(!root)return;
    root.querySelectorAll("iframe,embed").forEach(addVkFallback);
  }
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
  function run(){fixInvite();fixChat();fixVideo();hardenSocket()}
  let tries=0;
  const timer=setInterval(()=>{run();if(++tries>35)clearInterval(timer)},1000);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run);else run();
  window.addEventListener("online",()=>{tries=0;hardenSocket();run()});
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
