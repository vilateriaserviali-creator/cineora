(() => {
  if (window.__LUNEVIA_PROFILE_NAV_INJECTED__) return;
  window.__LUNEVIA_PROFILE_NAV_INJECTED__ = true;
  const load = (src) => { if (document.querySelector(`script[src="${src}"]`)) return; const s=document.createElement('script'); s.src=src; s.defer=true; document.head.appendChild(s); };
  const start=()=>{ load('/profile-nav.js'); if(!document.querySelector('link[data-lunevia-profile-nav-css]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/profile-nav.css';l.dataset.luneviaProfileNavCss='1';document.head.appendChild(l);} };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
