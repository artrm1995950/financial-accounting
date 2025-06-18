// File: content/manual-operations.js

// Эндпоинты
const GET_OPS_URL   = 'content/manuals_opertions/get_manual_operations.php';
const SAVE_OP_URL   = 'content/manuals_opertions/save_manual_operation.php';
const DELETE_OP_URL = 'content/manuals_opertions/delete_manual_operation.php';

function el(id) {
  return document.getElementById(id);
}

function renderOperation(op) {
  const list = el('operations-list');
  const card = document.createElement('div');
  card.className = 'statement-item';
  card.dataset.id = op.id;
  card.innerHTML = `
    <div class="statement-info">
      <div class="statement-date">${op.date}</div>
      <div class="statement-category">${op.category}</div>
      <div class="statement-amount ${op.type === 'expense' ? 'expense' : 'income'}">
        ${op.type === 'expense' ? '-' : '+'}${parseFloat(op.amount).toFixed(2)} ₽
      </div>
      <div class="statement-type">${op.type === 'expense' ? 'Расход' : 'Доход'}</div>
    </div>
    <button class="btn-delete" data-id="${op.id}">Удалить</button>
  `;
  list.prepend(card);
}

async function loadOperations() {
  const list = el('operations-list');
  if (!list) return;
  list.innerHTML = '';
  try {
    const res  = await fetch(GET_OPS_URL, { credentials: 'include' });
    const data = await res.json();
    if (data.status !== 'success') throw new Error(data.message || 'Ошибка загрузки');
    data.operations.forEach(renderOperation);
  } catch (e) {
    console.error('loadOperations:', e);
  }
}

async function saveOperation(op) {
  const res  = await fetch(SAVE_OP_URL, {
    method:      'POST',
    credentials: 'include',
    headers:     { 'Content-Type': 'application/json' },
    body:        JSON.stringify(op)
  });
  const data = await res.json();
  if (data.status !== 'success') throw new Error(data.message);
  return data.operation;
}

async function deleteOperation(id) {
  const res  = await fetch(DELETE_OP_URL, {
    method:      'POST',
    credentials: 'include',
    headers:     { 'Content-Type': 'application/json' },
    body:        JSON.stringify({ id })
  });
  const data = await res.json();
  if (data.status !== 'success') throw new Error(data.message);
}

function initFormAndDelete() {
  // Добавление — только в manual-filter
  const addBtn = document.querySelector('.manual-filter .btn-add');
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      const op = {
        date:     el('op-date').value,
        category: el('op-category').value,
        amount:   el('op-amount').value,
        type:     el('op-type').value
      };
      try {
        const saved = await saveOperation(op);
        renderOperation(saved);
        el('op-date').value     = '';
        el('op-category').selectedIndex = 0;
        el('op-amount').value   = '';
        el('op-type').selectedIndex     = 0;
      } catch (e) {
        alert('Ошибка добавления: ' + e.message);
      }
    });
  }

  // Удаление (делегирование) — общий селектор OK
  const opsList = el('operations-list');
  if (opsList) {
    opsList.addEventListener('click', async e => {
      const btn = e.target.closest('.btn-delete');
      if (!btn) return;
      if (!confirm('Удалить операцию?')) return;
      try {
        await deleteOperation(btn.dataset.id);
        btn.closest('.statement-item')?.remove();
      } catch (e) {
        alert('Ошибка удаления: ' + e.message);
      }
    });
  }
}

// MutationObserver ждёт появления manual-filter и инициализирует
const opsObserver = new MutationObserver(() => {
  const panel = document.querySelector('.manual-filter');
  if (!panel || panel.dataset.inited) return;
  panel.dataset.inited = '1';
  initFormAndDelete();
  loadOperations();
});

opsObserver.observe(document.body, { childList: true, subtree: true });
