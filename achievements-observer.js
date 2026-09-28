(() => {
  if (window.__CINEORA_ACHIEVEMENT_OBSERVER__) return;
  window.__CINEORA_ACHIEVEMENT_OBSERVER__ = true;
  const api = () => window.CINEORA && window.CINEORA.achievement;
  let roomDone = false;
  let messageDone = false;
  let styleDone = false;
  let lastTick = Date.now();
  const text = el => (el?.textContent || '').trim().toLowerCase();
  const markRoom = () => { if (!roomDone && api()) { roomDone = true; api().roomCreated(); } };
  const markMessage = () => { if (!messageDone && api()) { messageDone = true; api().messageSent(); } };
  const markStyle = () => { if (!styleDone && api()) { styleDone = true; api().profileStyled(); } };
  const scan = () => {
    document.querySelectorAll('button,a,[role="button"]').forEach(el => {
      const t = text(el);
      if (/создать\s+(комнату|сессию)/i.test(t)) el.addEventListener('click', markRoom, {once:true});
      if (/отправить|send|послать/i.test(t)) el.addEventListener('click', markMessage, {once:true});
    });
    document.querySelectorAll('form').forEach(form => {
      const t = text(form);
      if (/чат|сообщен|message/i.test(t)) form.addEventListener('submit', markMessage, {once:true});
      if (/создать.*(комнат|сесс)/i.test(t)) form.addEventListener('submit', markRoom, {once:true});
    });
    document.querySelectorAll('input,select,button').forEach(el => {
      const t = `${el.id||''} ${el.name||''} ${el.getAttribute('aria-label')||''}`.toLowerCase();
      if (/avatar|аватар|frame|рамк|mascot|маскот/.test(t)) el.addEventListener('change', markStyle, {once:true});
    });
  };
  const watch = () => {
    const v = document.querySelector('video');
    if (!v || v.paused || v.ended) { lastTick = Date.now(); return; }
    const now = Date.now();
    const minutes = (now-lastTick)/60000;
    if (minutes >= 1 && api()) { api().watch(Math.floor(minutes)); lastTick = now; }
  };
  scan();
  new MutationObserver(scan).observe(document.documentElement, {subtree:true, childList:true});
  setInterval(watch, 30000);
})();
