(() => {
  const $=s=>document.querySelector(s);
  const defaults={name:'Летта',bio:'«Кино становится ближе.»',avatar:'✦',frame:'Классика',mascot:'CINEORA Mascot'};
  let profile=defaults;try{profile={...defaults,...JSON.parse(localStorage.getItem('cineoraProfile')||'{}')}}catch(_){ }
  const avatars=['✦','🎬','🍿','🌙','♥','✧','▶','☺'];
  const frames=['Классика','Неон','Золото'];
  const mascots=[{name:'CINEORA Mascot',src:'/mascots/cineora.svg'},{name:'Попкорн',src:'/mascots/popcorn.svg'},{name:'Кино',src:'/mascots/cinema.svg'},{name:'Готово',src:'/mascots/ready.svg'}];
  const modal=$('#profileModal'),name=$('#profileName'),bio=$('#profileBio'),avatar=$('#profileAvatar'),frame=$('#profileFrame'),mascot=$('#profileMascot'),mascotPreview=$('#profileMascotPreview');
  const editName=$('#editName'),editBio=$('#editBio'),avatarChoices=$('#avatarChoices'),frameChoices=$('#frameChoices'),mascotChoices=$('#mascotChoices');
  const mascotInfo=()=>mascots.find(m=>m.name===profile.mascot)||mascots[0];
  function render(){
    name.textContent=profile.name;bio.textContent=profile.bio;frame.textContent=profile.frame;mascot.textContent=profile.mascot;
    avatar.dataset.frame=profile.frame.toLowerCase();avatar.textContent=profile.avatar;
    const m=mascotInfo();
    if(mascotPreview)mascotPreview.innerHTML=`<img src="${m.src}" alt="${m.name}">`;
  }
  function choices(){
    avatarChoices.innerHTML='';avatars.forEach(x=>{const b=document.createElement('button');b.type='button';b.className='avatar-choice'+(x===profile.avatar?' active':'');b.textContent=x;b.onclick=()=>{profile.avatar=x;choices();render()};avatarChoices.appendChild(b)});
    frameChoices.innerHTML='';frames.forEach(x=>{const b=document.createElement('button');b.type='button';b.className='frame-choice'+(x===profile.frame?' active':'');b.textContent=x;b.onclick=()=>{profile.frame=x;choices();render()};frameChoices.appendChild(b)});
    mascotChoices.innerHTML='';mascots.forEach(m=>{const b=document.createElement('button');b.type='button';b.className='mascot-choice'+(m.name===profile.mascot?' active':'');b.innerHTML=`<img src="${m.src}" alt="${m.name}"><span>${m.name}</span>`;b.onclick=()=>{profile.mascot=m.name;choices();render()};mascotChoices.appendChild(b)});
  }
  function openEditor(){editName.value=profile.name;editBio.value=profile.bio;choices();modal.hidden=false;editName.focus()}
  function closeEditor(){modal.hidden=true}
  $('#editProfile').onclick=openEditor;$('#cancelEdit').onclick=closeEditor;
  $('#saveEdit').onclick=()=>{profile.name=editName.value.trim()||defaults.name;profile.bio=editBio.value.trim()||defaults.bio;localStorage.setItem('cineoraProfile',JSON.stringify(profile));render();closeEditor()};
  modal.addEventListener('click',e=>{if(e.target===modal)closeEditor()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)closeEditor()});render();
})();
