(() => {
  const $ = s => document.querySelector(s);
  const defaults = {name:'Летта',bio:'«Кино становится ближе.»',avatar:'✦',frame:'Классика',mascot:'CINEORA Mascot'};
  let profile = defaults;
  try { profile={...defaults,...JSON.parse(localStorage.getItem('cineoraProfile')||'{}')}; } catch(_) {}
  const avatars=['✦','🎬','🍿','🌙','♥','✧','▶','☺'];
  const frames=['Классика','Неон','Золото'];
  const modal=$('#profileModal'), name=$('#profileName'), bio=$('#profileBio'), avatar=$('#profileAvatar'), frame=$('#profileFrame'), mascot=$('#profileMascot');
  const editName=$('#editName'), editBio=$('#editBio'), avatarChoices=$('#avatarChoices'), frameChoices=$('#frameChoices');
  function render(){name.textContent=profile.name;bio.textContent=profile.bio;avatar.textContent=profile.avatar;frame.textContent=profile.frame;mascot.textContent=profile.mascot}
  function choices(){avatarChoices.innerHTML='';avatars.forEach(x=>{const b=document.createElement('button');b.type='button';b.className='avatar-choice'+(x===profile.avatar?' active':'');b.textContent=x;b.onclick=()=>{profile.avatar=x;choices()};avatarChoices.appendChild(b)});frameChoices.innerHTML='';frames.forEach(x=>{const b=document.createElement('button');b.type='button';b.className='frame-choice'+(x===profile.frame?' active':'');b.textContent=x;b.onclick=()=>{profile.frame=x;choices()};frameChoices.appendChild(b)})}
  function open(){editName.value=profile.name;editBio.value=profile.bio;choices();modal.hidden=false;editName.focus()}
  function close(){modal.hidden=true}
  $('#editProfile').onclick=open;$('#cancelEdit').onclick=close;$('#saveEdit').onclick=()=>{profile.name=editName.value.trim()||defaults.name;profile.bio=editBio.value.trim()||defaults.bio;localStorage.setItem('cineoraProfile',JSON.stringify(profile));render();close()};modal.addEventListener('click',e=>{if(e.target===modal)close()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close()});render();
})();
