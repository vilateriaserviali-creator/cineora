(() => {
  const $=s=>document.querySelector(s);
  const defaults={name:'Летта',bio:'«Кино становится ближе.»',avatar:'✦',frame:'Классика',mascot:'LUNEVIA Mascot'};
  const achievementDefs=[
    {id:'first-room',icon:'🎬',title:'Первая комната',hint:'Создай свою комнату',test:s=>s.rooms>=1},
    {id:'movie-fan',icon:'🍿',title:'Киноман',hint:'Посмотри фильм вместе',test:s=>s.watchMinutes>=30},
    {id:'on-line',icon:'💬',title:'На связи',hint:'Отправь сообщение в чате',test:s=>s.messages>=1},
    {id:'cineora',icon:'✦',title:'LUNEVIA',hint:'Настрой свой профиль',test:s=>s.profileCustomised}
  ];
  let profile=defaults;let stats={rooms:0,watchMinutes:0,messages:0};
  try{profile={...defaults,...JSON.parse(localStorage.getItem('luneviaProfile')||localStorage.getItem('cineoraProfile')||'{}')}}catch(_){ }
  try{stats={...stats,...JSON.parse(localStorage.getItem('luneviaStats')||localStorage.getItem('cineoraStats')||'{}')}}catch(_){ }
  const avatars=['✦','🎬','🍿','🌙','♥','✧','▶','☺'];
  const frames=['Классика','Неон','Золото'];
  const mascots=[{name:'LUNEVIA Mascot',src:'/mascots/cineora.svg'},{name:'Попкорн',src:'/mascots/popcorn.svg'},{name:'Кино',src:'/mascots/cinema.svg'},{name:'Готово',src:'/mascots/ready.svg'}];
  const modal=$('#profileModal'),name=$('#profileName'),bio=$('#profileBio'),avatar=$('#profileAvatar'),frame=$('#profileFrame'),mascot=$('#profileMascot'),mascotPreview=$('#profileMascotPreview');
  const editName=$('#editName'),editBio=$('#editBio'),avatarChoices=$('#avatarChoices'),frameChoices=$('#frameChoices'),mascotChoices=$('#mascotChoices');
  const mascotInfo=()=>mascots.find(m=>m.name===profile.mascot)||mascots[0];
  const customised=()=>profile.name!==defaults.name||profile.bio!==defaults.bio||profile.avatar!==defaults.avatar||profile.frame!==defaults.frame||profile.mascot!==defaults.mascot;
  function getState(){return {...stats,profileCustomised:customised()}}
  function saveStats(){localStorage.setItem('luneviaStats',JSON.stringify(stats))}
  function updateAchievements(){
    const state=getState();let unlocked=0;
    document.querySelectorAll('.achievement-item').forEach((el,i)=>{const d=achievementDefs[i];if(!d)return;const ok=d.test(state);el.classList.toggle('locked',!ok);el.classList.toggle('unlocked',ok);if(ok)unlocked++;const hint=el.querySelector('small');if(hint)hint.textContent=ok?'Получено ✓':d.hint});
    const count=$('#achievementCount');if(count)count.textContent=`${unlocked}/${achievementDefs.length}`;
    const statNodes=document.querySelectorAll('.profile-stats strong');if(statNodes[0])statNodes[0].textContent=stats.rooms;if(statNodes[1])statNodes[1].textContent=stats.watchMinutes>=60?`${Math.floor(stats.watchMinutes/60)} ч`:`${stats.watchMinutes} мин`;if(statNodes[2])statNodes[2].textContent=unlocked;
  }
  function render(){name.textContent=profile.name;bio.textContent=profile.bio;frame.textContent=profile.frame;mascot.textContent=profile.mascot;avatar.dataset.frame=profile.frame.toLowerCase();avatar.textContent=profile.avatar;const m=mascotInfo();if(mascotPreview)mascotPreview.innerHTML=`<img src="${m.src}" alt="${m.name}">`;updateAchievements()}
  function choices(){
    avatarChoices.innerHTML='';avatars.forEach(x=>{const b=document.createElement('button');b.type='button';b.className='avatar-choice'+(x===profile.avatar?' active':'');b.textContent=x;b.onclick=()=>{profile.avatar=x;choices();render()};avatarChoices.appendChild(b)});
    frameChoices.innerHTML='';frames.forEach(x=>{const b=document.createElement('button');b.type='button';b.className='frame-choice'+(x===profile.frame?' active':'');b.textContent=x;b.onclick=()=>{profile.frame=x;choices();render()};frameChoices.appendChild(b)});
    mascotChoices.innerHTML='';mascots.forEach(m=>{const b=document.createElement('button');b.type='button';b.className='mascot-choice'+(m.name===profile.mascot?' active':'');b.innerHTML=`<img src="${m.src}" alt="${m.name}"><span>${m.name}</span>`;b.onclick=()=>{profile.mascot=m.name;choices();render()};mascotChoices.appendChild(b)});
  }
  function openEditor(){editName.value=profile.name;editBio.value=profile.bio;choices();modal.hidden=false;editName.focus()}
  function closeEditor(){modal.hidden=true}
  $('#editProfile').onclick=openEditor;$('#cancelEdit').onclick=closeEditor;
  $('#saveEdit').onclick=()=>{profile.name=editName.value.trim()||defaults.name;profile.bio=editBio.value.trim()||defaults.bio;localStorage.setItem('luneviaProfile',JSON.stringify(profile));render();closeEditor()};
  modal.addEventListener('click',e=>{if(e.target===modal)closeEditor()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)closeEditor()});
  window.LUNEVIA=window.LUNEVIA||{};
  window.LUNEVIA.achievement={
    roomCreated(){stats.rooms++;saveStats();updateAchievements()},
    messageSent(){stats.messages++;saveStats();updateAchievements()},
    watch(minutes=1){stats.watchMinutes+=Math.max(0,Number(minutes)||0);saveStats();updateAchievements()},
    refresh(){try{stats={...stats,...JSON.parse(localStorage.getItem('cineoraStats')||'{}')}}catch(_){}render()}
  };
  window.addEventListener('storage',e=>{if(e.key==='luneviaStats'||e.key==='luneviaProfile'||e.key==='cineoraStats'||e.key==='cineoraProfile')window.LUNEVIA.achievement.refresh()});
  render();
})();
