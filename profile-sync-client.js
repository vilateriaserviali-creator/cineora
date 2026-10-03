(() => {
  const PROFILE_KEY='luneviaProfile';
  const STATS_KEY='luneviaStats';
  const CODE_KEY='luneviaSyncCode';
  const makeCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(8)),x=>x.toString(36).toUpperCase().padStart(2,'0')).join('').slice(0,8);
  const read=(k,f)=>{try{return {...f,...JSON.parse(localStorage.getItem(k)||'{}')}}catch{return {...f}}};
  const profile=()=>read(PROFILE_KEY,{name:'Летта',bio:'«Кино становится ближе.»',avatar:'✦',frame:'Классика',mascot:'LUNEVIA Mascot'});
  const stats=()=>read(STATS_KEY,{rooms:0,messages:0,watchMinutes:0,styled:false});
  const code=()=>{let c=localStorage.getItem(CODE_KEY);if(!/^[A-Z0-9]{8}$/.test(c||'')){c=makeCode();localStorage.setItem(CODE_KEY,c)}return c};
  let timer=0;
  async function push(){try{const r=await fetch('/api/profile/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({syncCode:code(),profile:profile(),stats:stats()})});if(!r.ok)return;const d=await r.json();if(d.stats)localStorage.setItem(STATS_KEY,JSON.stringify(d.stats));}catch{}}
  async function pull(c=code(),apply=true){try{const r=await fetch('/api/profile/sync/'+encodeURIComponent(c));if(!r.ok)return false;const d=await r.json();if(apply){if(d.profile)localStorage.setItem(PROFILE_KEY,JSON.stringify(d.profile));if(d.stats)localStorage.setItem(STATS_KEY,JSON.stringify(d.stats));window.dispatchEvent(new Event('lunevia:profile-synced'));}return true}catch{return false}}
  function render(){if(!document.body.classList.contains('lunevia-profile-page'))return;let box=document.getElementById('luneviaSyncBox');if(box)return;box=document.createElement('section');box.id='luneviaSyncBox';box.className='profile-sync-box';box.innerHTML='<div><b>☁ Синхронизация</b><small>Один код — профиль и достижения на разных устройствах</small></div><strong id="luneviaSyncCode"></strong><div class="profile-sync-actions"><button type="button" id="copySyncCode">Скопировать код</button><button type="button" id="useSyncCode">Ввести код</button></div><small id="luneviaSyncStatus">Синхронизация включена</small>';const card=document.querySelector('.profile-card');if(card)card.appendChild(box);document.getElementById('luneviaSyncCode').textContent=code();document.getElementById('copySyncCode').onclick=async()=>{await navigator.clipboard?.writeText(code());document.getElementById('luneviaSyncStatus').textContent='Код скопирован';};document.getElementById('useSyncCode').onclick=async()=>{const entered=prompt('Введите 8-значный код LUNEVIA с другого устройства:');if(!entered)return;const c=String(entered).trim().toUpperCase();if(!/^[A-Z0-9]{8}$/.test(c)){alert('Код должен состоять из 8 символов.');return;}if(await pull(c)){localStorage.setItem(CODE_KEY,c);location.reload();}else alert('Профиль с таким кодом не найден.');};}
  const boot=async()=>{render();const existing=localStorage.getItem(CODE_KEY);if(existing)await pull(existing,false);else await push();render();timer=setInterval(push,60000);};
  window.addEventListener('lunevia:stats',push);window.addEventListener('storage',e=>{if(e.key===PROFILE_KEY||e.key===STATS_KEY)push();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
