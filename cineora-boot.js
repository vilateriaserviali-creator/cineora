(() => {
  const files=['/achievements.js','/achievements-hooks.js','/achievements-observer.js'];
  const load=src=>new Promise(resolve=>{if(document.querySelector(`script[src="${src}"]`)){resolve();return}const s=document.createElement('script');s.src=src;s.async=true;s.onload=resolve;s.onerror=resolve;document.head.appendChild(s)});
  const start=()=>files.reduce((p,src)=>p.then(()=>load(src)),Promise.resolve());
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
