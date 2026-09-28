(() => {
  const back = document.querySelector('.profile-back');
  const edit = document.querySelector('.profile-edit');
  if (back) back.href = '/';
  if (edit) edit.addEventListener('click', () => {
    alert('Редактирование профиля добавим следующим шагом ✦');
  });
})();
