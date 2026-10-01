(() => {
  if (window.__CINEORA_VOICE_DISABLED__) return;
  window.__CINEORA_VOICE_DISABLED__ = true;
  const hideVoice = () => {
    document.querySelectorAll('.voice-panel, [class*="voice-panel"], [id*="voice-panel"], [id*="voicePanel"]').forEach(el => {
      el.setAttribute('hidden','');
      el.style.setProperty('display','none','important');
    });
    document.querySelectorAll('[class*="voice"], [id*="voice"]').forEach(el => {
      const text=(el.textContent||'').trim();
      if (/голосов|voice|микрофон|microphone/i.test(text) && el.closest('button,a')) {
        el.closest('button,a').style.setProperty('display','none','important');
      }
    });
  };
  const fixChat = () => {
    document.querySelectorAll('.chat-panel, .chat-messages, .chat-body, .messages, .messages-list').forEach(el => {
      el.style.minHeight='0';
      el.style.minWidth='0';
      el.style.overflow='auto';
      el.style.webkitOverflowScrolling='touch';
      el.style.boxSizing='border-box';
    });
    document.querySelectorAll('.chat-panel, .chat').forEach(el => {
      el.style.flex='1 1 auto';
    });
  };
  const run=()=>{hideVoice();fixChat();};
  run();
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('resize',run,{passive:true});
})();
