// Эндпоинты
const GET_TRADES_URL   = 'content/trade_operations/get_trade_operations.php';
const SAVE_TRADE_URL   = 'content/trade_operations/save_trade_operation.php';
const DELETE_TRADE_URL = 'content/trade_operations/delete_trade_operation.php';

function el(id) {
  return document.getElementById(id);
}

function renderTrade(tr) {
  const list = el('trade-operations-list');
  const card = document.createElement('div');
  card.className = 'statement-item';
  card.dataset.id = tr.id;
  card.innerHTML = `
    <div class="statement-info">
      <div class="statement-date">${tr.purchase_date}</div>
      <div class="statement-detail">${tr.op_type === 'buy' ? '🟢 Покупка' : '🔴 Продажа'}</div>
      <div class="statement-detail">Цена: ${parseFloat(tr.price_per_share).toFixed(2)} ₽</div>
      <div class="statement-detail">Кол-во: ${parseInt(tr.quantity,10)}</div>
      <div class="statement-detail">Тикер: ${tr.ticker.toUpperCase()}</div>
    </div>
    <button class="btn-delete" data-id="${tr.id}">Удалить</button>
  `;
  list.prepend(card);
}

async function loadTrades() {
  const list = el('trade-operations-list');
  if (!list) return;
  list.innerHTML = '';      // очищаем список перед добавлением

  try {
    const res  = await fetch(GET_TRADES_URL, { credentials:'include' });
    const data = await res.json();
    if (data.status !== 'success') throw new Error(data.message || 'Ошибка загрузки');
  // вместо текстового уведомления – отрисовываем каждую сделку карточкой:
+   data.trades.forEach(renderTrade);
  } catch (e) {
    console.error('loadTrades:', e);
  list.textContent = 'Ошибка загрузки';
  }
}


async function saveTrade(tr) {
  const res  = await fetch(SAVE_TRADE_URL, {
    method:      'POST',
    credentials: 'include',
    headers:     { 'Content-Type':'application/json' },
    body:        JSON.stringify(tr)
  });
  const data = await res.json();
  if (data.status !== 'success') throw new Error(data.message);
  return data.trade;
}

async function deleteTrade(id) {
  const res  = await fetch(DELETE_TRADE_URL, {
    method:      'POST',
    credentials: 'include',
    headers:     { 'Content-Type':'application/json' },
    body:        JSON.stringify({ id })
  });
  const data = await res.json();
  if (data.status !== 'success') throw new Error(data.message);
}

function initTradeForm() {
  const panel = document.querySelector('.trade-filter');
  if (!panel) return;

  // Добавление сделки
  panel.querySelector('.btn-add-trade').addEventListener('click', async () => {
    const tr = {
      purchase_date:   el('trade-date').value,
      price_per_share: el('trade-price').value,
      quantity:        el('trade-quantity').value,
      op_type:         el('trade-type').value,
      ticker:          el('trade-ticker').value.trim()
    };
    try {
      const saved = await saveTrade(tr);
      renderTrade(saved);
      // очистить поля
      ['trade-date','trade-price','trade-quantity','trade-type','trade-ticker']
        .forEach(id => el(id).value = '');
    } catch (e) {
      alert('Ошибка добавления: ' + e.message);
    }
  });

  // Удаление сделки (делегирование)
  el('trade-operations-list').addEventListener('click', async e => {
    const btn = e.target.closest('.btn-delete');
    if (!btn) return;
    if (!confirm('Удалить сделку?')) return;
    try {
      await deleteTrade(btn.dataset.id);
      btn.closest('.statement-item')?.remove();
    } catch (e) {
      alert('Ошибка удаления: ' + e.message);
    }
  });

  loadTrades();
}

// Ждём появления панели trade-filter



// MutationObserver ждёт появления manual-filter и инициализирует
const obsTorg = new MutationObserver(() => {
  const panel = document.querySelector('.trade-filter');
  if (!panel || panel.dataset.inited) return;
  panel.dataset.inited = '1';
  initTradeForm();
});

obsTorg.observe(document.body, { childList: true, subtree: true });
