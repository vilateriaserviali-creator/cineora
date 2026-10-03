const roomUiFixStyle=document.createElement("style");roomUiFixStyle.textContent=`
/* LUNEVIA room: keep the sidebar compact and keep the chat composer visible. */
.room-view.show .room-layout{align-items:start!important}
.room-view.show .side-card{height:auto!important;max-height:none!important;min-height:0!important;position:static!important;overflow:hidden!important}
.room-view.show .side-card .chat{display:flex!important;flex-direction:column!important;min-height:0!important;height:330px!important;overflow:hidden!important}
.room-view.show .side-card .chat-messages{flex:1 1 auto!important;min-height:0!important;height:auto!important;max-height:none!important;overflow-y:auto!important;padding:11px!important}
.room-view.show .side-card .chat-form{display:flex!important;visibility:visible!important;opacity:1!important;flex:0 0 auto!important;position:relative!important;bottom:auto!important;z-index:120!important;align-items:center!important;gap:6px!important;padding:9px!important}
.room-view.show .side-card .chat-form input{display:block!important;visibility:visible!important;opacity:1!important;flex:1 1 auto!important;min-width:0!important;width:auto!important;height:42px!important;box-sizing:border-box!important}
.room-view.show .side-card .chat-form>button{display:flex!important;visibility:visible!important;opacity:1!important;flex:0 0 46px!important;width:46px!important;height:42px!important;align-items:center!important;justify-content:center!important}
.room-view.show .side-card .emoji-toggle{display:grid!important;flex:0 0 42px!important;width:42px!important;height:42px!important}
.room-view.show #universalPlayer{position:absolute!important;inset:0!important;width:100%!important;height:100%!important}
.room-view.show #universalPlayer iframe,.room-view.show #universalPlayer video{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border:0!important}
.room-view.show .player-wrap{position:relative!important;aspect-ratio:16/9!important;min-height:0!important}
.lunevia-media-frame{position:absolute;inset:0;width:100%;height:100%;border:0;background:#09080b}
.lunevia-media-video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}
.lunevia-media-fallback{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;padding:25px;text-align:center;background:#0d0b10;color:#eee7f1;z-index:5}
.lunevia-media-fallback strong{font-size:17px}.lunevia-media-fallback span{max-width:520px;color:#aaa0ad;font-size:12px;line-height:1.5}.lunevia-media-fallback a{display:inline-flex;padding:10px 16px;border-radius:999px;background:#b996c4;color:#211722;font-weight:700;text-decoration:none}
@media(max-width:1000px){.room-view.show .side-card .chat{height:360px!important}}
@media(max-width:600px){.room-view.show .side-card .chat{height:320px!important}.room-view.show .side-card .chat-form{padding:8px!important}.room-view.show .side-card .chat-form input,.room-view.show .side-card .chat-form>button{height:40px!important}.room-view.show .player-wrap{aspect-ratio:16/9!important}}
`;document.head.appendChild(roomUiFixStyle);

/* FINAL ROOM RESTORE: override the later large-video layer without touching chat logic. */
const roomLayoutRestoreStyle=document.createElement("style");roomLayoutRestoreStyle.id="lunevia-room-layout-restore";roomLayoutRestoreStyle.textContent=`
.room-view.show .room-layout{
  width:min(1480px,calc(100% - 48px))!important;
  margin:18px auto 28px!important;
  grid-template-columns:minmax(0,1fr) 410px!important;
  gap:18px!important;
  align-items:start!important;
}
.room-view.show .watch-card{min-width:0!important;width:100%!important}
.room-view.show .side-card{
  width:410px!important;min-width:410px!important;max-width:410px!important;
  height:calc(100vh - 100px)!important;min-height:520px!important;max-height:900px!important;
  position:sticky!important;top:84px!important;overflow:hidden!important;
  display:flex!important;flex-direction:column!important;align-self:start!important;
}
.room-view.show .side-card>.side-title{
  flex:0 0 42px!important;height:42px!important;min-height:42px!important;padding:12px 16px!important;box-sizing:border-box!important;
}
.room-view.show .side-card>.participants{
  flex:0 0 112px!important;height:112px!important;min-height:112px!important;max-height:112px!important;
  overflow:hidden!important;padding:4px 10px 7px!important;gap:4px!important;
}
.room-view.show .side-card .person-row{
  flex:0 0 50px!important;width:100%!important;height:50px!important;min-height:50px!important;max-height:50px!important;
  padding:6px 9px!important;box-sizing:border-box!important;overflow:hidden!important;
}
.room-view.show .side-card>.voice-panel{
  flex:0 0 74px!important;width:100%!important;height:74px!important;min-height:74px!important;max-height:74px!important;
  overflow:hidden!important;padding:7px 11px!important;box-sizing:border-box!important;
}
.room-view.show .side-card .voice-head{height:23px!important;min-height:23px!important;margin:0!important}
.room-view.show .side-card .voice-title{font-size:13px!important;line-height:1!important;margin:0!important}
.room-view.show .side-card .voice-toggle{height:24px!important;min-height:24px!important;padding:0 9px!important;font-size:9px!important}
.room-view.show .side-card .voice-tools{height:13px!important;min-height:13px!important;margin:1px 0 0!important;overflow:hidden!important}
.room-view.show .side-card .voice-users{height:15px!important;min-height:15px!important;margin:1px 0 0!important;overflow:hidden!important;white-space:nowrap!important}
.room-view.show .side-card>.chat{
  flex:1 1 auto!important;width:100%!important;min-width:0!important;min-height:0!important;height:auto!important;max-height:none!important;
  display:flex!important;flex-direction:column!important;overflow:hidden!important;
}
.room-view.show .side-card .chat-title-row{flex:0 0 46px!important;height:46px!important;min-height:46px!important;padding:0 14px!important;box-sizing:border-box!important;display:flex!important;align-items:center!important}
.room-view.show .side-card .chat-title-row .side-title{padding:0!important;font-size:18px!important;line-height:1!important}
.room-view.show .side-card .chat-messages{flex:1 1 auto!important;min-height:0!important;height:auto!important;max-height:none!important;overflow-y:auto!important;padding:10px!important}
.room-view.show .side-card .chat-form{flex:0 0 58px!important;width:100%!important;height:58px!important;min-height:58px!important;max-height:58px!important;padding:8px!important;box-sizing:border-box!important;display:flex!important;align-items:center!important;position:relative!important;inset:auto!important}
.room-view.show .side-card .chat-form input{height:40px!important;min-height:40px!important;max-height:40px!important}
.room-view.show .side-card .chat-form>button{height:40px!important;min-height:40px!important;max-height:40px!important;flex:0 0 42px!important;width:42px!important}
.room-view.show .side-card .emoji-toggle{width:40px!important;min-width:40px!important;height:40px!important}
@media(max-width:1000px){
  .room-view.show .room-layout{width:calc(100% - 20px)!important;margin:12px auto 20px!important;grid-template-columns:1fr!important;gap:12px!important}
  .room-view.show .side-card{width:100%!important;min-width:0!important;max-width:none!important;height:auto!important;min-height:0!important;max-height:none!important;position:static!important}
  .room-view.show .side-card>.participants{height:112px!important;min-height:112px!important;max-height:112px!important}
  .room-view.show .side-card>.voice-panel{height:74px!important;min-height:74px!important;max-height:74px!important}
  .room-view.show .side-card>.chat{height:440px!important;min-height:440px!important;max-height:440px!important}
}
@media(max-width:600px){
  .room-view.show .room-layout{width:100%!important;margin:8px 0 14px!important;gap:8px!important}
  .room-view.show .side-card>.participants{height:104px!important;min-height:104px!important;max-height:104px!important}
  .room-view.show .side-card>.voice-panel{height:68px!important;min-height:68px!important;max-height:68px!important}
  .room-view.show .side-card>.chat{height:360px!important;min-height:360px!important;max-height:360px!important}
}
`;
document.head.appendChild(roomLayoutRestoreStyle);

const modal=document.getElementById("modal"),nameInput=document.getElementById("name"),roomInput=document.getElementById("room"),title=document.getElementById("modalTitle"),text=document.getElementById("modalText");
function openModal(create){title.textContent=create?"Создать сессию":"Присоединиться к сессии";text.textContent=create?"Введите имя — код сессии будет создан автоматически.":"Введите имя и код сессии, который вам отправили.";roomInput.value=create?String(Math.floor(1000+Math.random()*9000)):"";roomInput.placeholder=create?"Код создан автоматически":"Код сессии";modal.classList.remove("hidden");nameInput.focus()}
document.getElementById("join").onclick=()=>openModal(false);document.getElementById("create").onclick=()=>openModal(true);document.getElementById("createTop").onclick=()=>openModal(true);document.getElementById("login").onclick=()=>openModal(false);document.getElementById("close").onclick=()=>modal.classList.add("hidden");
document.getElementById("go").onclick=()=>{const n=nameInput.value.trim()||"Гость",r=roomInput.value.trim().toUpperCase();if(!r)return;sessionStorage.setItem("lunevia_name",n);location.href="/?room="+encodeURIComponent(r)};

const ideaModal=document.getElementById("ideaModal"),ideaText=document.getElementById("ideaText"),ideaName=document.getElementById("ideaName"),ideaStatus=document.getElementById("ideaStatus");document.getElementById("ideaBtn").onclick=()=>{ideaStatus.textContent="";ideaModal.classList.remove("hidden");ideaText.focus()};document.getElementById("ideaClose").onclick=()=>ideaModal.classList.add("hidden");document.getElementById("ideaSend").onclick=async()=>{const text=ideaText.value.trim();if(text.length<3){ideaStatus.textContent="Напишите предложение чуть подробнее.";return}const btn=document.getElementById("ideaSend");btn.disabled=true;ideaStatus.textContent="Отправляем...";try{const r=await fetch("/api/suggestions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:ideaName.value.trim()||"Гость",text})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Не удалось отправить");ideaStatus.textContent="Спасибо! Предложение отправлено администратору.";ideaText.value="";setTimeout(()=>ideaModal.classList.add("hidden"),1200)}catch(e){ideaStatus.textContent=e.message||"Не удалось отправить предложение."}finally{btn.disabled=false}};

const newsFeed=document.getElementById("newsFeed");
async function loadNews(){try{const r=await fetch("/api/news");const d=await r.json();if(!r.ok||!d.news?.length)return;newsFeed.innerHTML=d.news.map(x=>`<article class="news-card"><div class="news-date">${new Date(x.createdAt).toLocaleDateString("ru-RU")}</div><h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.text)}</p></article>`).join("")}catch(e){}}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}
loadNews();

const q=new URLSearchParams(location.search).get("room");
if(q){document.querySelector(".hero").style.display="none";document.querySelectorAll(".section,.footer").forEach(el=>el.style.display="none");document.getElementById("modal").classList.add("hidden");document.getElementById("roomView").classList.add("show");startRoom(q.toUpperCase())}

function mediaKind(url){
  try{
    const u=new URL(url,location.href),h=u.hostname.toLowerCase(),p=u.pathname.toLowerCase();
    if(/youtube\\.com$|youtu\\.be$/.test(h)||h.endsWith(".youtube.com"))return"youtube";
    if(h==="rutube.ru"||h.endsWith(".rutube.ru"))return"rutube";
    if(h==="vk.com"||h.endsWith(".vk.com")||h==="vkvideo.ru"||h.endsWith(".vkvideo.ru"))return"vk";
    if(/\\.(mp4|webm|ogg|ogv|m4v|mov)(?:$|\\?)/i.test(p))return"video";
    if(/\\.(m3u8)(?:$|\\?)/i.test(p))return"video";
    return"iframe";
  }catch(e){return"iframe"}
}
function mediaEmbedUrl(url){
  try{
    const u=new URL(url,location.href),h=u.hostname.toLowerCase(),p=u.pathname;
    if(h.includes("youtu.be")){const id=p.replace(/^\\//,"").split("/")[0];return "https://www.youtube.com/embed/"+encodeURIComponent(id)+"?enablejsapi=1&origin="+encodeURIComponent(location.origin)}
    if(h.includes("youtube.com")){
      const id=u.searchParams.get("v")||((p.match(/\\/shorts\\/([^/]+)/)||[])[1]);
      if(id)return "https://www.youtube.com/embed/"+encodeURIComponent(id)+"?enablejsapi=1&origin="+encodeURIComponent(location.origin);
    }
    if(h==="rutube.ru"||h.endsWith(".rutube.ru")){
      const m=p.match(/\\/video\\/([a-zA-Z0-9_-]+)/);if(m)return "https://rutube.ru/play/embed/"+encodeURIComponent(m[1])+"/";
    }
    return url;
  }catch(e){return url}
}
function clearMedia(){
  const root=document.getElementById("universalPlayer");
  const video=document.getElementById("roomVideo");
  if(root)root.innerHTML="";
  if(video){video.removeAttribute("src");video.load();video.style.display="none"}
}
function renderMedia(url){
  const root=document.getElementById("universalPlayer"),video=document.getElementById("roomVideo"),empty=document.getElementById("emptyPlayer");
  const clean=String(url||"").trim();
  if(!clean){clearMedia();if(empty)empty.style.display="grid";const s=document.getElementById("mediaStatus");if(s)s.textContent="Видео пока не добавлено";return}
  if(empty)empty.style.display="none";
  const status=document.getElementById("mediaStatus");if(status)status.textContent="Видео загружено";
  if(root)root.innerHTML="";
  if(video)video.style.display="none";
  const kind=mediaKind(clean);
  if(kind==="video"){
    const v=video||document.createElement("video");
    v.className="lunevia-media-video";v.controls=true;v.playsInline=true;v.preload="metadata";v.src=clean;
    if(!video&&root)root.appendChild(v);else if(video){if(root)root.appendChild(video);}
    v.style.display="block";v.onerror=()=>showMediaFallback(clean,"Не удалось открыть этот прямой видеофайл.");
    return;
  }
  const frame=document.createElement("iframe");frame.className="lunevia-media-frame";frame.allow="autoplay; fullscreen; picture-in-picture; encrypted-media";frame.allowFullscreen=true;frame.referrerPolicy="strict-origin-when-cross-origin";frame.src=mediaEmbedUrl(clean);
  frame.addEventListener("error",()=>showMediaFallback(clean,"Внешний видеоплеер не ответил."));
  if(root)root.appendChild(frame);
  if(kind==="vk")setTimeout(()=>{if(frame.isConnected&&!frame.dataset.loaded)showMediaFallback(clean,"VK Video сейчас не отвечает.")},9000);
  frame.addEventListener("load",()=>{frame.dataset.loaded="1"});
}
function showMediaFallback(url,message){
  const root=document.getElementById("universalPlayer");if(!root)return;root.innerHTML="";
  const box=document.createElement("div");box.className="lunevia-media-fallback";
  const strong=document.createElement("strong");strong.textContent=message;
  const span=document.createElement("span");span.textContent="Комната и чат продолжают работать. Можно открыть источник напрямую.";
  const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener";a.textContent="Открыть видео";
  box.append(strong,span,a);root.appendChild(box);
}

function startRoom(roomId){
  const socket=io({
    transports:["websocket","polling"],
    timeout:60000,
    reconnection:true,
    reconnectionAttempts:Infinity,
    reconnectionDelay:1000,
    reconnectionDelayMax:10000,
    auth:{roomId,name:sessionStorage.getItem("lunevia_name")||"Гость",avatar:"mascot",frame:"creator",privateRoom:new URLSearchParams(location.search).get("private")==="1"}
  });
  window.socket=socket;
  const myName=sessionStorage.getItem("lunevia_name")||"Гость";
  const video=document.getElementById("roomVideo"),empty=document.getElementById("emptyPlayer"),participants=document.getElementById("participants"),chatMessages=document.getElementById("chatMessages");
  let suppress=false,lastProgress=0;
  const roomCodeLabel=document.getElementById("roomCodeLabel"),myRoomName=document.getElementById("myRoomName");
  if(roomCodeLabel)roomCodeLabel.textContent=roomId;if(myRoomName)myRoomName.textContent=myName;
  function fmt(sec){sec=Math.max(0,Math.floor(Number(sec)||0));const m=Math.floor(sec/60),s=String(sec%60).padStart(2,"0");return m+":"+s}
  function applySync(playing,pos){suppress=true;try{if(video&&Number.isFinite(Number(pos))&&Math.abs((video.currentTime||0)-Number(pos))>0.6)video.currentTime=Number(pos);if(video){if(playing)video.play().catch(()=>{});else video.pause()}}finally{setTimeout(()=>suppress=false,180)}}
  function loadMedia(url){const input=document.getElementById("mediaUrlRoom");if(input)input.value=url||"";renderMedia(url)}
  function renderUsers(users){if(!participants)return;const count=document.getElementById("participantCount");if(count)count.textContent=users.length;participants.innerHTML=users.map(u=>`<div class="person-row"><span class="person-name">${escapeHtml(u.name)}${u.id===socket.id?" · вы":""}</span><span class="person-time">${fmt(u.position)} ${u.playing?"▶":"Ⅱ"}</span></div>`).join("")}
  function renderChatHistory(messages){if(!chatMessages)return;chatMessages.innerHTML="";(messages||[]).forEach(addMessage);chatMessages.scrollTop=chatMessages.scrollHeight}
  function addMessage(m){if(!chatMessages)return;const el=document.createElement("div");el.className="chat-msg";el.innerHTML=`<b>${escapeHtml(m.name||"Гость")}</b><span>${escapeHtml(m.text)}</span><small>${escapeHtml(m.createdAt?new Date(m.createdAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}):(m.time||""))}</small>`;chatMessages.appendChild(el);chatMessages.scrollTop=chatMessages.scrollHeight}

  const setMediaBtn=document.getElementById("setMediaRoom");
  if(setMediaBtn)setMediaBtn.onclick=()=>{const url=(document.getElementById("mediaUrlRoom")?.value||"").trim();if(!url)return;setMediaBtn.disabled=true;socket.emit("set-media",{url},()=>{setMediaBtn.disabled=false})};
  const copyBtn=document.getElementById("copyRoom");
  if(copyBtn)copyBtn.onclick=async()=>{const url=location.origin+"/?room="+encodeURIComponent(roomId);try{await navigator.clipboard.writeText(url);copyBtn.textContent="Ссылка скопирована";setTimeout(()=>copyBtn.textContent="Скопировать ссылку",1500)}catch(e){prompt("Скопируйте ссылку:",url)}};
  const leaveBtn=document.getElementById("leaveRoom");if(leaveBtn)leaveBtn.onclick=()=>{socket.disconnect();location.href="/"};

  /* Playback is deliberately NOT broadcast automatically. A participant chooses when to sync. */
  const syncBtn=document.getElementById("syncBtn");
  if(syncBtn)syncBtn.onclick=()=>{const position=video?video.currentTime:0;const playing=video?!video.paused:false;socket.emit("sync",{playing,position});const state=document.getElementById("syncState");if(state){state.textContent="Синхронизация отправлена";state.classList.add("lunevia-sync-ok");setTimeout(()=>state.textContent="Готово к синхронизации",1300)}};
  if(video){video.addEventListener("timeupdate",()=>{if(Date.now()-lastProgress>1000){lastProgress=Date.now();socket.emit("user-progress",{position:video.currentTime,playing:!video.paused,duration:video.duration||0})}})}

  const chatForm=document.getElementById("chatForm"),chatInput=document.getElementById("chatInput");
  if(chatForm&&chatInput){chatForm.onsubmit=e=>{e.preventDefault();const msg=chatInput.value.trim();if(!msg)return;chatInput.disabled=true;socket.emit("chat-message",{text:msg},()=>{chatInput.disabled=false;chatInput.value="";chatInput.focus()});setTimeout(()=>{chatInput.disabled=false},3000)};chatForm.style.display="flex";chatInput.style.display="block"}

  socket.on("connect",()=>{document.querySelector(".room-view")?.classList.remove("connection-lost");socket.emit("join-room",{roomId,name:myName,avatar:"mascot",frame:"creator",privateRoom:new URLSearchParams(location.search).get("private")==="1"});socket.emit("request-room-state");socket.emit("request-room-users")});
  socket.on("disconnect",()=>document.querySelector(".room-view")?.classList.add("connection-lost"));
  socket.on("connect_error",err=>console.warn("[LUNEVIA] Socket.IO:",err.message));
  socket.on("room-state",state=>{loadMedia(state.mediaUrl);if(video&&state.mediaUrl&&Number.isFinite(Number(state.position))){suppress=true;video.currentTime=Number(state.position)||0;setTimeout(()=>suppress=false,200)}});
  socket.on("media-changed",data=>loadMedia(typeof data==="string"?data:data?.url));
  socket.on("sync",state=>applySync(state.playing,state.position));
  socket.on("sync-state",state=>applySync(state.playing,state.position));
  socket.on("room-users",renderUsers);
  socket.on("chat-history",renderChatHistory);
  socket.on("chat-message",addMessage);
  socket.on("chat-warning",m=>{if(!chatMessages)return;const el=document.createElement("div");el.className="chat-msg";el.innerHTML=`<span>${escapeHtml(m.text||"")}</span>`;chatMessages.appendChild(el);chatMessages.scrollTop=chatMessages.scrollHeight});
}

/* LUNEVIA FINAL DESKTOP ROOM FIX
   The cinema CSS in index.html is loaded before client.js. The old restore rules
   were therefore overriding cinema-mode. Keep the normal room layout, but give
   cinema-mode its own final layer and keep the top room panel at the top. */
(()=>{
  const style=document.createElement("style");
  style.id="lunevia-final-desktop-room-fix";
  style.textContent=`
    .room-view.show .room-top{
      position:sticky!important;
      top:0!important;
      z-index:900!important;
      flex:0 0 76px!important;
    }
    .room-view.show .room-layout{position:relative!important;z-index:1!important}

    .room-view.show.cinema-mode{
      position:fixed!important;
      inset:0!important;
      width:100vw!important;
      height:100dvh!important;
      min-height:100dvh!important;
      overflow:hidden!important;
      z-index:500!important;
      background:#0d0c10!important;
    }
    .room-view.show.cinema-mode .room-top{
      position:relative!important;
      top:auto!important;
      height:58px!important;
      min-height:58px!important;
      flex:0 0 58px!important;
      z-index:950!important;
    }
    .room-view.show.cinema-mode .room-layout{
      width:100%!important;
      max-width:none!important;
      height:calc(100dvh - 58px)!important;
      min-height:0!important;
      margin:0!important;
      display:grid!important;
      grid-template-columns:minmax(0,1fr) 360px!important;
      gap:0!important;
      align-items:stretch!important;
    }
    .room-view.show.cinema-mode .watch-card{
      height:100%!important;
      min-width:0!important;
      width:100%!important;
      border-radius:0!important;
      display:flex!important;
      flex-direction:column!important;
      background:#09090b!important;
    }
    .room-view.show.cinema-mode .watch-head{
      flex:0 0 58px!important;
      min-height:58px!important;
    }
    .room-view.show.cinema-mode .player-wrap{
      flex:1 1 auto!important;
      width:100%!important;
      height:auto!important;
      min-height:0!important;
      max-height:none!important;
      aspect-ratio:auto!important;
      border-radius:0!important;
    }
    .room-view.show.cinema-mode #universalPlayer{
      position:absolute!important;
      inset:0!important;
      width:100%!important;
      height:100%!important;
    }
    .room-view.show.cinema-mode #universalPlayer iframe,
    .room-view.show.cinema-mode #universalPlayer video{
      position:absolute!important;
      inset:0!important;
      width:100%!important;
      height:100%!important;
      border:0!important;
    }
    .room-view.show.cinema-mode .side-card{
      width:360px!important;
      min-width:360px!important;
      max-width:360px!important;
      height:100%!important;
      min-height:0!important;
      max-height:none!important;
      position:relative!important;
      top:auto!important;
      right:auto!important;
      overflow:hidden!important;
      border-radius:0!important;
      display:flex!important;
      flex-direction:column!important;
    }
    .room-view.show.cinema-mode .side-card>.chat{
      flex:1 1 auto!important;
      min-height:0!important;
      height:auto!important;
      max-height:none!important;
    }
    .room-view.show.cinema-mode .side-card .chat-messages{min-height:0!important}
    .room-view.show.cinema-mode .side-card .chat-form{flex:0 0 58px!important;height:58px!important;min-height:58px!important;max-height:58px!important}
    .room-view.show.cinema-mode .side-card .participants{max-height:135px!important}
    .room-view.show.cinema-mode .cinema-toggle{background:#6a526f!important;color:#fff!important;border-color:#7b6280!important}

    @media(max-width:1000px){
      .room-view.show.cinema-mode .room-layout{display:block!important;height:calc(100dvh - 58px)!important;position:relative!important}
      .room-view.show.cinema-mode .watch-card{height:100%!important}
      .room-view.show.cinema-mode .side-card{
        position:absolute!important;
        top:0!important;
        right:0!important;
        width:min(370px,88vw)!important;
        min-width:0!important;
        max-width:none!important;
        height:100%!important;
        transform:translateX(102%)!important;
        z-index:970!important;
      }
      .room-view.show.cinema-mode.cinema-chat-open .side-card{transform:translateX(0)!important}
    }
    @media(max-width:600px){
      .room-view.show.cinema-mode .room-top{height:52px!important;min-height:52px!important;flex-basis:52px!important}
      .room-view.show.cinema-mode .room-layout{height:calc(100dvh - 52px)!important}
      .room-view.show.cinema-mode .player-wrap{height:calc(100dvh - 104px)!important}
    }
  `;
  document.head.appendChild(style);
})();
