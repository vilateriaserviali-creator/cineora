/* LUNEVIA — achievement bridge
 * Safe, client-side only. Room code can call window.LUNEVIA.achievement.roomCreated(),
 * messageSent() and watch(minutes). The bridge also watches common room controls
 * without changing the room UI or sync logic.
 */
(() => {
  const KEY='luneviaStats';
  const read=()=>{try{return {...{rooms:0,messages:0,watchMinutes:0,styled:false},...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return {rooms:0,messages:0,watchMinutes:0,styled:false}}};
  const save=s=>localStorage.setItem(KEY,JSON.stringify(s));
  const notify=()=>window.dispatchEvent(new CustomEvent('lunevia:stats',{detail:read()}));
  const api={
    roomCreated(){const s=read();s.rooms+=1;save(s);notify()},
    messageSent(){const s=read();s.messages+=1;save(s);notify()},
    watch(minutes){const n=Math.max(0,Number(minutes)||0);if(!n)return;const s=read();s.watchMinutes+=n;save(s);notify()},
    styleUsed(){const s=read();s.styled=true;save(s);notify()},
    getStats:read
  };
  window.LUNEVIA=window.LUNEVIA||{};
  window.LUNEVIA.achievement=Object.assign(window.LUNEVIA.achievement||{},api);
  let last=Date.now(), wasPlaying=false;
  const tick=()=>{
    const now=Date.now();
    if(wasPlaying && now-last>0 && now-last<90000) api.watch((now-last)/60000);
    last=now;
  };
  setInterval(tick,30000);
  document.addEventListener('play',()=>{wasPlaying=true;last=Date.now()},true);
  document.addEventListener('pause',()=>{tick();wasPlaying=false},true);
  document.addEventListener('ended',()=>{tick();wasPlaying=false},true);
  window.addEventListener('beforeunload',tick);
})();
