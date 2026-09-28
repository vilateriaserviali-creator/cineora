(() => {
  const nameEl = document.querySelector('#profileName');
  const bioEl = document.querySelector('#profileBio');
  const avatarEl = document.querySelector('#profileAvatar');
  const frameEl = document.querySelector('#profileFrame');
  const mascotEl = document.querySelector('#profileMascot');
  const edit = document.querySelector('#editProfile');

  const defaults = { name: 'Летта', bio: '«Кино становится ближе.»', avatar: '✦', frame: 'Классика', mascot: 'CINEORA Mascot' };
  let profile = defaults;
  try { profile = { ...defaults, ...JSON.parse(localStorage.getItem('cineoraProfile') || '{}') }; } catch (_) {}

  function render() {
    if (nameEl) nameEl.textContent = profile.name;
    if (bioEl) bioEl.textContent = profile.bio;
    if (avatarEl) avatarEl.textContent = profile.avatar;
    if (frameEl) frameEl.textContent = profile.frame;
    if (mascotEl) mascotEl.textContent = profile.mascot;
  }

  function editProfile() {
    const name = window.prompt('Имя профиля', profile.name);
    if (name === null) return;
    const bio = window.prompt('Короткая фраза', profile.bio);
    if (bio === null) return;
    const avatar = window.prompt('Символ аватарки', profile.avatar);
    if (avatar === null) return;
    profile = { ...profile, name: name.trim() || defaults.name, bio: bio.trim() || defaults.bio, avatar: avatar.trim() || defaults.avatar };
    localStorage.setItem('cineoraProfile', JSON.stringify(profile));
    render();
  }

  if (edit) edit.addEventListener('click', editProfile);
  render();
})();
