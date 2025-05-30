// ProfileScript.js

// Пути к скриптам
const GET_PROFILE    = 'get_user_profile.php';
const UPDATE_NAME    = 'content/update_userName_profile.php';
const SAVE_SOCIAL    = 'content/save_profile.php';
const UPDATE_NICK    = 'content/update_userNick_profile.php';
const UPDATE_BIRTH   = 'content/update_userBirth_profile.php';
const UPDATE_ABOUT   = 'content/update_userAbout_profile.php';

// Функции работы с сервером
function loadProfileData() {
  fetch(GET_PROFILE, { credentials:'include' })
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(data => {
      el('profile-name').value   = data.full_name   || '';
      el('profile-email').value  = data.email       || '';
      el('socialLink').value     = data.social_link || '';
      el('profile-nick').value   = data.nickname    || '';
      el('profile-birth').value  = data.birth_date  || '';
      el('profile-about').value  = data.about       || '';
    })
    .catch(console.error);
}

function postForm(path, field, value, successMsg) {
  const fd = new FormData();
  fd.append(field, value);
  return fetch(path, { method:'POST', credentials:'include', body:fd })
    .then(r => {
      const ct = r.headers.get('Content-Type')||'';
      if (!r.ok || !ct.includes('application/json'))
        return r.text().then(t => Promise.reject(t));
      return r.json();
    })
    .then(d => {
      if (d.status === 'success') alert(successMsg);
      else alert('Ошибка: ' + d.message);
    })
    .catch(e => {
      console.error(e);
      alert('Не удалось сохранить');
    });
}

// Обработчики сохранения
function saveName()  {
  const v = el('profile-name').value.trim();
  if (!v) return alert('Имя не может быть пустым');
  postForm(UPDATE_NAME, 'full_name', v, 'Имя сохранено');
}
function saveSocial() {
  const v = el('socialLink').value.trim();
  if (!v) return alert('Введите ссылку');
  postForm(SAVE_SOCIAL, 'social_link', v, 'Ссылка сохранена');
}
function saveNick() {
  const v = el('profile-nick').value.trim();
  if (!v) return alert('Никнейм не может быть пустым');
  postForm(UPDATE_NICK, 'nickname', v, 'Никнейм сохранён');
}
function saveBirth() {
  const v = el('profile-birth').value;
  if (!v) return alert('Укажите дату');
  postForm(UPDATE_BIRTH, 'birth_date', v, 'Дата сохранена');
}
function saveAbout() {
  const v = el('profile-about').value.trim();
  if (!v) return alert('Опишите себя');
  postForm(UPDATE_ABOUT, 'about', v, 'О себе сохранено');
}

// Утилита
function el(id) { return document.getElementById(id); }

// Наблюдаем за вставкой формы профиля и инициализируем каждую вставку
const observer = new MutationObserver(() => {
  const nameField = el('profile-name');
  if (nameField && !nameField.dataset.inited) {
    // отмечаем, что эта форма уже инициализирована
    nameField.dataset.inited = '1';
    // вешаем слушатели
    nameField.nextElementSibling.addEventListener('click', saveName);
    el('socialLink').nextElementSibling.addEventListener('click', saveSocial);
    el('profile-nick').nextElementSibling.addEventListener('click', saveNick);
    el('profile-birth').nextElementSibling.addEventListener('click', saveBirth);
    el('profile-about').nextElementSibling.addEventListener('click', saveAbout);
    // загружаем данные из базы
    loadProfileData();
  }
});

observer.observe(document.body, { childList: true, subtree: true });
