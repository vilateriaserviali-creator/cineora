(() => {
  const api = () => window.CINEORA && window.CINEORA.achievement;
  const once = (key, fn) => { let done=false; return (...args)=>{ if(done)return; done=true; fn(...args); }; };
  const room = once('room', () => api()?.roomCreated());
  const message = once('message', () => api()?.messageSent());
  window.addEventListener('cineora:room-created', room);
  window.addEventListener('cineora:message-sent', message);
  window.addEventListener('cineora:profile-styled', () => api()?.profileStyled());
  let last = 0;
  const tick = () => {
    const a = api();
    if (!a) return;
    const video = document.querySelector('.room-view video, video');
    if (!video || video.paused || video.ended) { last = Date.now(); return; }
    const now = Date.now();
    if (!last) last = now;
    const minutes = (now-last)/60000;
    if (minutes >= 1) { a.watch(Math.floor(minutes)); last = now; }
  };
  setInterval(tick, 30000);
})();
