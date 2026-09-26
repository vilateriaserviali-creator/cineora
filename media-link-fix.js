/* CINEORA compatibility layer: media links + Chrome WebAudio autoplay guard. */
(function(){
  "use strict";

  function clean(v){return String(v||"").trim();}
  function yt(raw){
    try{
      const u=new URL(raw),h=u.hostname.toLowerCase().replace(/^www\./,"");let id="";
      if(h==="youtu.be") id=u.pathname.split("/").filter(Boolean)[0]||"";
      else if(h==="youtube.com"||h.endsWith(".youtube.com")||h==="youtube-nocookie.com"||h.endsWith(".youtube-nocookie.com")){
        if(u.pathname==="/watch") id=u.searchParams.get("v")||"";
        else {const p=u.pathname.split("/").filter(Boolean);if(["shorts","embed","live","v"].includes(p[0]))id=p[1]||"";}
      }
      id=id.replace(/[^a-zA-Z0-9_-]/g,"");return id.length>=6&&id.length<=20?id:"";
    }catch(e){return "";}
  }
  function vk(raw){
    try{
      const u=new URL(raw),h=u.hostname.toLowerCase().replace(/^www\./,"");
      if(!["vk.com","vk.ru","m.vk.com","vkvideo.ru"].includes(h))return "";
      if(u.pathname.toLowerCase()==="/video_ext.php"){
        const oid=u.searchParams.get("oid"),id=u.searchParams.get("id");
        if(oid&&id)return "https://vkvideo.ru/video_ext.php?oid="+encodeURIComponent(oid)+"&id="+encodeURIComponent(id)+"&hd="+encodeURIComponent(u.searchParams.get("hd")||"2")+"&js_api=1";
      }
      const z=decodeURIComponent(u.searchParams.get("z")||"");let m=z.match(/video(-?\d+)_([0-9]+)/i);
      if(!m)m=u.pathname.match(/(?:^|\/)(?:video|live)(-?\d+)_([0-9]+)/i);
      if(m){const oid=m[1].startsWith("-")?m[1]:"-"+m[1];return "https://vkvideo.ru/video_ext.php?oid="+encodeURIComponent(oid)+"&id="+encodeURIComponent(m[2])+"&hd=2&js_api=1";}
      const q=(u.searchParams.get("video")||u.searchParams.get("video_id")||"").match(/^(-?\d+)_([0-9]+)$/);
      if(q){const oid=q[1].startsWith("-")?q[1]:"-"+q[1];return "https://vkvideo.ru/video_ext.php?oid="+encodeURIComponent(oid)+"&id="+encodeURIComponent(q[2])+"&hd=2&js_api=1";}
    }catch(e){}
    return "";
  }
  function rt(raw){
    try{
      const u=new URL(raw),h=u.hostname.toLowerCase().replace(/^www\./,"");
      if(h!=="rutube.ru"&&!h.endsWith(".rutube.ru"))return "";
      const p=u.pathname.split("/").filter(Boolean);
      if(p[0]==="play"&&p[1]==="embed"&&p[2])return "https://rutube.ru/play/embed/"+encodeURIComponent(p[2]);
      if(p[0]==="video"&&p[1])return "https://rutube.ru/video/"+encodeURIComponent(p[1]);
      if(p[0]==="shorts"&&p[1])return "https://rutube.ru/video/"+encodeURIComponent(p[1]);
      const q=u.searchParams.get("v")||u.searchParams.get("video");if(q)return "https://rutube.ru/video/"+encodeURIComponent(q);
    }catch(e){}
    return "";
  }
  function canonicalize(value){const raw=clean(value);if(!raw)return raw;return yt(raw)?"https://www.youtube.com/watch?v="+yt(raw):vk(raw)||rt(raw)||raw;}
  function fix(){const input=document.getElementById("mediaUrlRoom");if(!input)return;const next=canonicalize(input.value);if(next&&next!==input.value)input.value=next;}

  document.addEventListener("DOMContentLoaded",()=>{
    const input=document.getElementById("mediaUrlRoom");
    if(input){input.addEventListener("input",fix);input.addEventListener("paste",()=>setTimeout(fix,0));}
    const button=document.getElementById("setMediaRoom");if(button)button.addEventListener("pointerdown",fix,true);
  });

  /* Chrome blocks WebAudio until a real user gesture. Defer automatic chat-audio
     startup instead of creating/resuming AudioContext on page load. */
  const contexts=new Set();
  const NativeAudioContext=window.AudioContext||window.webkitAudioContext;
  if(NativeAudioContext && !window.__cineoraAudioPatched){
    window.__cineoraAudioPatched=true;
    function PatchedAudioContext(){
      const C=new.target||PatchedAudioContext;
      const ctx=Reflect.construct(NativeAudioContext,[],C);
      contexts.add(ctx);
      return ctx;
    }
    PatchedAudioContext.prototype=NativeAudioContext.prototype;
    Object.setPrototypeOf(PatchedAudioContext,NativeAudioContext);
    try{window.AudioContext=PatchedAudioContext;if(window.webkitAudioContext)window.webkitAudioContext=PatchedAudioContext;}catch(e){}
  }
  let gestureReady=false;
  async function resumeAll(){
    gestureReady=true;
    for(const ctx of Array.from(contexts)){try{if(ctx.state==="suspended")await ctx.resume();}catch(e){}}
  }
  ["pointerdown","touchstart","keydown"].forEach(type=>document.addEventListener(type,resumeAll,{capture:true,passive:true,once:true}));

  function wrapAudioFunction(name){
    if(window["__cineoraWrapped_"+name])return true;
    const original=window[name];if(typeof original!=="function")return false;
    const wrapped=function(...args){
      if(gestureReady)return original.apply(this,args);
      const run=()=>{gestureReady=true;Promise.resolve(resumeAll()).finally(()=>{try{original.apply(this,args);}catch(e){console.warn("CINEORA audio startup skipped:",e);}});};
      document.addEventListener("pointerdown",run,{once:true,capture:true});
      document.addEventListener("touchstart",run,{once:true,capture:true});
      document.addEventListener("keydown",run,{once:true,capture:true});
      return null;
    };
    window[name]=wrapped;window["__cineoraWrapped_"+name]=true;return true;
  }
  function tryWrap(){const a=wrapAudioFunction("prepareChatAudio"),b=wrapAudioFunction("enableChatSound");return a&&b;}
  if(!tryWrap()){
    let n=0;const timer=setInterval(()=>{if(tryWrap()||++n>100)clearInterval(timer);},50);
  }
})();
