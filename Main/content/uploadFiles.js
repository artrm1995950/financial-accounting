// файл: uploadFiles.js
// ***** Авто-подгрузка при каждом появлении вкладки «Выписки» *****
// файл: uploadFiles.js

// ***** НОВЫЙ МЕХАНИЗМ ДЛЯ ПОДГРУЗКИ ПРИ КАЖДОМ ВХОЖДЕНИИ *****
// Следим за тем, когда в DOM появится контейнер #statements-list
const uploadObserver  = new MutationObserver((mutations) => {
  const container = document.getElementById('statements-list');
  if (container && !container.dataset.loaded) {
    container.dataset.loaded = '1'; // пометим, что уже загрузили
    loadStatements();
  }
});
uploadObserver.observe(document.body, { childList: true, subtree: true });
// *******************************************************

const BANK_LABELS = {
  sber:   'Сбер',
  tinkoff:'Тинькофф Банк',
  ozon:   'Озон Банк',
  akbars: 'Ак Барс Банк',
  yandex: 'Яндекс Банк'
};



// URL для работы
const LIST_URL   = 'content/get_statements.php';
const UPLOAD_URL = 'content/upload_file.php';
// --- Рендер списка выписок ---
function renderItem(o) {
  const item = document.createElement('div');
   const dateOnly = o.upload_date.split(' ')[0]; 
  item.className = 'statement-item';
  item.innerHTML = `
    <div class="statement-info">
      <div class="file-name">${o.fileUrl}</div>
      <div class="bank-name">${BANK_LABELS[o.bank] || o.bank}</div>
      <div class="statement-date">${dateOnly}</div>
    </div>
    <button class="btn-download">Скачать</button>
    <button class="btn-delete" data-id="${o.id}">Удалить</button>
  `;
  const fn = item.querySelector('.file-name');
  fn.title = o.fileUrl;

  // Скачивание
  // Скачивание
// Внутри renderItem, вместо fetch/blob
item.querySelector('.btn-download').addEventListener('click', () => {
  // создаём невидимую ссылку
  const a = document.createElement('a');
  a.href = 'content/download_statement.php?id=' + o.id;
  // атрибут download укажет браузеру открыть диалог сохранения
  a.setAttribute('download', '');
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});




  // Удаление
  item.querySelector('.btn-delete').addEventListener('click', async () => {
    if (!confirm('Точно удалить эту выписку?')) return;
    const id = item.querySelector('.btn-delete').dataset.id;
    const fd = new FormData();
    fd.append('id', id);

    try {
      const res  = await fetch('content/delete_statement.php', {
        method: 'POST',
        credentials: 'include',
        body: fd
      });
      const json = await res.json();
      if (json.status === 'success') {
        await loadStatements();
      } else {
        alert('Ошибка: ' + json.message);
      }
    } catch (err) {
      console.error(err);
      alert('Сетевая ошибка при удалении');
    }
  });

  return item;
}


async function loadStatements() {
  const container = document.getElementById('statements-list');
  if (!container) return;
  container.innerHTML = '';
  try {
    const res  = await fetch(LIST_URL, { credentials: 'include' });
    const json = await res.json();
    if (json.status === 'success') {
      if (!json.statements.length) {
        container.textContent = 'Выписок нет';
      } else {
        json.statements.forEach(o => {
          container.appendChild(renderItem(o));
        });
      }
    } else {
      console.error('Ошибка загрузки выписок:', json.message);
    }
  } catch (err) {
    console.error('Network error при загрузке выписок:', err);
  }
}

// --- Существующая логика выбора и отправки файла ---

// Показываем имя выбранного файла
document.addEventListener('change', (e) => {
  if (e.target.id === 'file-input') {
    const file = e.target.files[0];
    const nameDisplay = document.getElementById('file-name-display');
    if (nameDisplay) {
      nameDisplay.value = file ? file.name : '';
    }
  }
});

// Клик по «Добавить»
document.addEventListener('click', async (e) => {
  if (!e.target.classList.contains('btn-add')) return;

  const dateInput   = document.getElementById('statement-date');
  const bankSelect  = document.getElementById('bank-select');
  const fileInput   = document.getElementById('file-input');
  const nameDisplay = document.getElementById('file-name-display');
  const addButton   = e.target;

  if (!dateInput || !bankSelect || !fileInput || !nameDisplay) return;
  if (!fileInput.files.length) {
    alert('Пожалуйста, выберите файл');
    return;
  }

  addButton.disabled    = true;
  addButton.textContent = 'Загрузка...';

  const fd = new FormData();
  fd.append('statement_date', dateInput.value);
  fd.append('bank',          bankSelect.value);
  fd.append('file',          fileInput.files[0]);

  try {
    const res  = await fetch(UPLOAD_URL, {
      method: 'POST',
      credentials: 'include',
      body: fd
    });
    const json = await res.json();

    if (json.status === 'success') {
      dateInput.value          = '';
      bankSelect.selectedIndex = 0;
      fileInput.value          = '';
      nameDisplay.value        = '';
      alert('Файл успешно добавлен');
      // *** Обновляем список сразу после добавления ***
      await loadStatements();
    } else {
      alert('Ошибка: ' + (json.message || 'неизвестная'));
    }
  } catch (err) {
    console.error(err);
    alert('Сетевая ошибка при отправке');
  } finally {
    addButton.disabled    = false;
    addButton.textContent = 'Добавить';
  }
});

// --- Инициализация при загрузке страницы ---
document.addEventListener('DOMContentLoaded', () => {
  // Существующие функции не трогаем
  loadStatements();
});
const parentContainer = document.querySelector('#main-content') || document.body;

