(() => {
  if (window.__LUNEVIA_ACHIEVEMENT_HOOKS__) return;
  window.__LUNEVIA_ACHIEVEMENT_HOOKS__ = true;
  const api = () => window.LUNEVIA && window.LUNEVIA.achievement;
  const once = fn => { let done = false; return (...args) => { if (done) return; done = true; fn(...args); }; };
  const room = once(() => api()?.roomCreated());
  const message = once(() => api()?.messageSent());
  const style = once(() => api()?.styleUsed());
  window.addEventListener('lunevia:room-created', room);
  window.addEventListener('lunevia:message-sent', message);
  window.addEventListener('lunevia:profile-styled', style);
  let last = Date.now();
  const tick = () => {
    const a = api();
    const video = document.querySelector('.room-view video, video');
    if (!a || !video || video.paused || video.ended) { last = Date.now(); return; }
    const now = Date.now();
    const minutes = (now - last) / 60000;
    if (minutes >= 1 && minutes < 10) { a.watch(Math.floor(minutes)); last = now; }
    else if (minutes >= 10) last = now;
  };
  setInterval(tick, 30000);
})();
