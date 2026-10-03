(() => {
  if (window.__LUNEVIA_PROFILE_NAV__) return;
  window.__LUNEVIA_PROFILE_NAV__ = true;
  const add = () => {
    if (document.querySelector('[data-lunevia-profile-nav]')) return;
    const a = document.createElement('a');
    a.href = '/profile.html';
    a.dataset.luneviaProfileNav = '1';
    a.className = 'lunevia-profile-nav';
    a.innerHTML = '<span aria-hidden="true">👤</span><span>Профиль</span>';
    document.body.appendChild(a);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add, {once:true}); else add();
})();
