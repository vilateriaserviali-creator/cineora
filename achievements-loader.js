(() => {
  if (window.__CINEORA_ACHIEVEMENTS_LOADER__) return;
  window.__CINEORA_ACHIEVEMENTS_LOADER__ = true;
  const src = '/achievements.js';
  const load = () => {
    if (document.querySelector('script[data-cineora-achievements]')) return;
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.dataset.cineoraAchievements = '1';
    document.head.appendChild(s);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, {once:true});
  else load();
})();
