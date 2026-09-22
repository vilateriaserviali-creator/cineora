

const modal=document.getElementById("modal"),nameInput=document.getElementById("name"),roomInput=document.getElementById("room"),title=document.getElementById("modalTitle"),text=document.getElementById("modalText");
function openModal(create){title.textContent=create?"Создать сессию":"Присоединиться к сессии";text.textContent=create?"Введите имя — код сессии будет создан автоматически.":"Введите имя и код сессии, который вам отправили.";roomInput.value=create?String(Math.floor(1000+Math.random()*9000)):"";roomInput.placeholder=create?"Код создан автоматически":"Код сессии";modal.classList.remove("hidden");nameInput.focus()}
document.getElementById("join").onclick=()=>openModal(false);document.getElementById("create").onclick=()=>openModal(true);document.getElementById("createTop").onclick=()=>openModal(true);document.getElementById("login").onclick=()=>openModal(false);document.getElementById("close").onclick=()=>modal.classList.add("hidden");
document.getElementById("go").onclick=()=>{const n=nameInput.value.trim()||"Гость",r=roomInput.value.trim().toUpperCase();if(!r)return;sessionStorage.setItem("cineora_name",n);location.href="/?room="+encodeURIComponent(r)};

const ideaModal=document.getElementById("ideaModal"),ideaText=document.getElementById("ideaText"),ideaName=document.getElementById("ideaName"),ideaStatus=document.getElementById("ideaStatus");document.getElementById("ideaBtn").onclick=()=>{ideaStatus.textContent="";ideaModal.classList.remove("hidden");ideaText.focus()};document.getElementById("ideaClose").onclick=()=>ideaModal.classList.add("hidden");document.getElementById("ideaSend").onclick=async()=>{const text=ideaText.value.trim();if(text.length<3){ideaStatus.textContent="Напишите предложение чуть подробнее.";return}const btn=document.getElementById("ideaSend");btn.disabled=true;ideaStatus.textContent="Отправляем...";try{const r=await fetch("/api/suggestions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:ideaName.value.trim()||"Гость",text})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Не удалось отправить");ideaStatus.textContent="Спасибо! Предложение отправлено администратору.";ideaText.value="";setTimeout(()=>ideaModal.classList.add("hidden"),1200)}catch(e){ideaStatus.textContent=e.message||"Не удалось отправить предложение."}finally{btn.disabled=false}};

const newsFeed=document.getElementById("newsFeed");
async function loadNews(){try{const r=await fetch("/api/news");const d=await r.json();if(!r.ok||!d.news?.length)return;newsFeed.innerHTML=d.news.map(x=>`<article class="news-card"><div class="news-date">${new Date(x.createdAt).toLocaleDateString("ru-RU")}</div><h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.text)}</p></article>`).join("")}catch(e){}}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}
loadNews();

const q=new URLSearchParams(location.search).get("room");
if(q){
  document.querySelector(".hero").style.display="none";
  document.querySelectorAll(".section,.footer").forEach(el=>el.style.display="none");
  document.getElementById("modal").classList.add("hidden");
  document.getElementById("roomView").classList.add("show");
  startRoom(q.toUpperCase());
}

function startRoom(roomId){
  const socket=io();
  const myName=sessionStorage.getItem("cineora_name")||"Гость";
  const video=document.getElementById("roomVideo"),empty=document.getElementById("emptyPlayer"),participants=document.getElementById("participants"),chatMessages=document.getElementById("chatMessages");
  let suppress=false,lastProgress=0;
  document.getElementById("roomCodeLabel").textContent=roomId;
  document.getElementById("myRoomName").textContent=myName;
  socket.emit("join-room",{roomId,name:myName});
  function fmt(sec){sec=Math.max(0,Math.floor(Number(sec)||0));const m=Math.floor(sec/60),s=String(sec%60).padStart(2,"0");return m+":"+s}
  function applySync(playing,pos){suppress=true;try{if(Math.abs((video.currentTime||0)-pos)>0.6)video.currentTime=pos;if(playing)video.play().catch(()=>{});else video.pause()}finally{setTimeout(()=>suppress=false,180)}}
  function loadMedia(url){document.getElementById("mediaUrlRoom").value=url||"";if(!url){video.removeAttribute("src");video.load();empty.style.display="grid";document.getElementById("mediaStatus").textContent="Видео пока не добавлено";return}video.src=url;video.load();empty.style.display="none";document.getElementById("mediaStatus").textContent="Видео загружено"}
  function renderUsers(users){document.getElementById("participantCount").textContent=users.length;participants.innerHTML=users.map(u=>`<div class="person-row"><span class="person-name">${escapeHtml(u.name)}${u.id===socket.id?" · вы":""}</span><span class="person-time">${fmt(u.position)} ${u.playing?"▶":"Ⅱ"}</span></div>`).join("")}
  function addMessage(m){const el=document.createElement("div");el.className="chat-msg";el.innerHTML=`<b>${escapeHtml(m.name||"Гость")}</b><span>${escapeHtml(m.text)}</span><small>${escapeHtml(m.time||"")}</small>`;chatMessages.appendChild(el);chatMessages.scrollTop=chatMessages.scrollHeight}
  document.getElementById("setMediaRoom").onclick=()=>{const url=document.getElementById("mediaUrlRoom").value.trim();if(url)socket.emit("set-media",{url})};
  document.getElementById("copyRoom").onclick=async()=>{const url=location.origin+"/?room="+encodeURIComponent(roomId);try{await navigator.clipboard.writeText(url);document.getElementById("copyRoom").textContent="Ссылка скопирована";setTimeout(()=>document.getElementById("copyRoom").textContent="Скопировать ссылку",1500)}catch(e){prompt("Скопируйте ссылку:",url)}};
  document.getElementById("leaveRoom").onclick=()=>{location.href="/"};
  video.addEventListener("play",()=>{if(!suppress)socket.emit("sync",{playing:true,position:video.currentTime})});
  video.addEventListener("pause",()=>{if(!suppress)socket.emit("sync",{playing:false,position:video.currentTime})});
  video.addEventListener("seeked",()=>{if(!suppress)socket.emit("sync",{playing:!video.paused,position:video.currentTime})});
  video.addEventListener("timeupdate",()=>{if(Date.now()-lastProgress>1000){lastProgress=Date.now();socket.emit("user-progress",{position:video.currentTime,playing:!video.paused})}});
  document.getElementById("chatForm").addEventListener("submit",e=>{e.preventDefault();const input=document.getElementById("chatInput"),msg=input.value.trim();if(!msg)return;socket.emit("chat-message",{text:msg});input.value=""});
  socket.on("room-state",state=>{loadMedia(state.mediaUrl);applySync(state.playing,state.position)});
  socket.on("media-changed",url=>loadMedia(url));
  socket.on("sync",state=>applySync(state.playing,state.position));
  socket.on("room-users",renderUsers);
  socket.on("chat-message",addMessage);
}
