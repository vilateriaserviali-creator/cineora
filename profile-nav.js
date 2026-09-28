(() => {
  if (window.__CINEORA_PROFILE_NAV__) return;
  window.__CINEORA_PROFILE_NAV__ = true;
  const add = () => {
    if (document.querySelector('[data-cineora-profile-nav]')) return;
    const a = document.createElement('a');
    a.href = '/profile.html';
    a.dataset.cineoraProfileNav = '1';
    a.className = 'cineora-profile-nav';
    a.innerHTML = '<span aria-hidden="true">👤</span><span>Профиль</span>';
    document.body.appendChild(a);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add, {once:true}); else add();
})();
