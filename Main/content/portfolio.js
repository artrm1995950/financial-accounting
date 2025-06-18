(() => {
  'use strict';

  /* ===================================================================
     portfolio.js — версия 2025‑06‑17 (добавлен вывод сравнения с фондами)
     =================================================================== */

  /* 1. Конфигурация */
  const TRADE_API    = 'content/trade_operations/get_trade_operations.php';
  const FUND_TICKERS = ['SBMM', 'BCSD', 'TMON', 'AKMP', 'MONY','GOLD','AKMM','AKMB','EQMX','LQDT'];
// ▸ ставим прямо под FUND_TICKERS
const FUND_LABELS = {
  SBMM: 'Сбер MM (депозиты)',
  BCSD: 'Газпромбанк.Короткие облигации',
  TMON: 'Тинькофф Money Market',
  AKMP: 'А-Капитал Мобильный',
  MONY: 'Raiffeisen Money Market',
  GOLD: 'Золото',
  AKMM: 'Альфа капитал денежный рынок',
  AKMB: 'БПИФ Индекс мосбиржи',
  LQDT: 'БПИФ Ликвидность УК ВИМ'
};

  /* Возможные markets, где хранятся свечи фондов/ПИФов */
  const BASES = [
    'https://iss.moex.com/iss/engines/stock/markets/funds',   // ETF, БПИФы
    'https://iss.moex.com/iss/engines/stock/markets/shares'   // паевые фонды, торгующиеся как акции
  ];

  /* Утилита: быстрый доступ по id  */
  const el = id => document.getElementById(id);

  /* ================================================================
     2. FIFO‑расчёт остатка по каждой бумаге
     ================================================================ */
  function calculateHoldingsFIFO(trades) {
    /* группируем сделки по тикеру */
    const byTicker = trades.reduce((acc, t) => {
      const tk = t.ticker.toUpperCase();
      acc[tk] ??= [];
      acc[tk].push({
        type : t.op_type,                      // buy | sell
        qty  : t.quantity,
        price: parseFloat(t.price_per_share),
        date : t.purchase_date
      });
      return acc;
    }, {});

    const result = {};
    for (const [tk, ops] of Object.entries(byTicker)) {
      ops.sort((a, b) => new Date(a.date) - new Date(b.date));

      const queue = [];          // очередь купленных лотов
      let totalQty  = 0;
      let totalCost = 0;
      let lastDate  = null;

      for (const op of ops) {
        if (op.type === 'buy') {
          queue.push({ qty: op.qty, price: op.price });
          totalQty  += op.qty;
          totalCost += op.qty * op.price;
          lastDate   = op.date;
        } else {                 // sell FIFO
          let toSell = op.qty;
          while (toSell && queue.length) {
            const lot = queue[0];
            if (lot.qty <= toSell) {
              toSell    -= lot.qty;
              totalQty  -= lot.qty;
              totalCost -= lot.qty * lot.price;
              queue.shift();
            } else {
              lot.qty   -= toSell;
              totalQty  -= toSell;
              totalCost -= toSell * lot.price;
              toSell     = 0;
            }
          }
        }
      }
      result[tk] = {
        quantity: totalQty,
        cost    : +totalCost.toFixed(2),
        date    : lastDate
      };
    }
    return result;
  }

  /* ================================================================
     3. Текущая цена акции (LAST) через marketdata.json
     ================================================================ */
  async function getCurrentPrice(ticker) {
    const url = `https://iss.moex.com/iss/engines/stock/markets/shares/securities/${ticker}/marketdata.json?iss.meta=off`;
    const r   = await fetch(url);
    const js  = await r.json();
    const md  = js.marketdata;
    if (!md?.data?.length) throw new Error(`Нет marketdata для ${ticker}`);
    return +md.data[0][md.columns.indexOf('LAST')];
  }

  /* ================================================================
     4. Пирог портфеля (Chart.js)
     ================================================================ */
  function renderPortfolioPie(holdings, prices) {
    const canvas = el('portfolio-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const labels = [];
    const data   = [];
    for (const [tk, h] of Object.entries(holdings)) {
      if (prices[tk] != null) {
        labels.push(tk);
        data.push(h.quantity * prices[tk]);
      }
    }

    new Chart(ctx, {
      type: 'pie',
      data: { labels, datasets: [{ data }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right' },
          tooltip: {
            callbacks: {
              label: c => {
                const v   = c.parsed;
                const pct = (v / data.reduce((a, b) => a + b, 0) * 100).toFixed(1);
                return `${c.label}: ${v.toLocaleString()} ₽ (${pct} %)`;
              }
            }
          }
        }
      }
    });
  }

  /* ================================================================
     5. Таблица позиций и общий баланс
     ================================================================ */
  function renderPortfolioInfo(holdings, prices) {
    const box = el('portfolio-info');
    if (!box) return;

    const totalQty   = Object.values(holdings).reduce((s, h) => s + h.quantity, 0);
    const totalCost  = Object.values(holdings).reduce((s, h) => s + h.cost, 0);
    const totalValue = Object.entries(holdings)
                             .reduce((s, [tk, h]) => s + h.quantity * (prices[tk] ?? 0), 0);

    /* выводим количество записей */
    const cnt = el('portfolio-count');
    if (cnt) cnt.textContent = totalQty;

    const pct = totalCost ? ((totalValue - totalCost) / totalCost * 100).toFixed(2) : '0.00';

    box.innerHTML = `
      <div class="portfolio-info__total">
        Общий баланс:
        <strong>${totalValue.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}</strong>
        <span class="portfolio-info__delta ${totalValue >= totalCost ? 'positive' : 'negative'}">(${pct} %)</span>
      </div>
      <table class="portfolio-info__table">
        <thead><tr><th>Тикер</th><th>Кол-во</th><th>Тек. стоимость</th><th>Δ %</th></tr></thead>
        <tbody>
          ${Object.entries(holdings).map(([tk, h]) => {
            const val = h.quantity * (prices[tk] ?? 0);
            const dp  = h.cost ? ((val - h.cost) / h.cost * 100).toFixed(2) : '0.00';
            return `
              <tr>
                <td>${tk}</td>
                <td>${h.quantity}</td>
                <td>${val.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}</td>
                <td class="portfolio-info__delta ${dp >= 0 ? 'positive' : 'negative'}">${dp}%</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }

  /* ================================================================
     6. ТАБЛИЦА сравнения портфеля с фондами
     ================================================================ */
 /* ============================================================
   Рендер блока «Сравнение с фондами» (портфель включён в массив)
   ============================================================ */
function renderFundsComparison(report) {
  let box = document.querySelector('.portfolio-funds');
  if (!box) {
    box = document.createElement('div');
    box.className = 'portfolio-funds';
    el('portfolio-info').after(box);               // ставим под карточкой портфеля
  }

  box.innerHTML = `
    <h2 class="portfolio-funds__title">Сравнение с фондами</h2>
    <table class="portfolio-funds__table">
      <thead>
        <tr><th>Фонд</th><th>Рост, %</th><th>Итог, ₽</th></tr>
      </thead>
      <tbody>
        ${report.map(r => {
          if (r.error) {
            /* фонд без данных */
            return `<tr><td>${r.label || r.ticker}</td><td colspan="2">${r.error}</td></tr>`;
          }

          const cls = r.growthPct >= 0 ? 'positive' : 'negative';

          /* имя — либо label, либо тикер + расшифровка */
          const name = r.label ??
                       (FUND_LABELS[r.ticker]
                         ? `${r.ticker} (${FUND_LABELS[r.ticker]})`
                         : r.ticker);

          return `
            <tr>
              <td>${name}</td>
              <td class="funds-delta ${cls}">${r.growthPct}%</td>
              <td>${(+r.finalValue).toLocaleString('ru-RU',
                     { style:'currency', currency:'RUB' })}</td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}


/* ============================================================
   Главная функция загрузки и вывода портфеля
   ============================================================ */
async function loadTradess() {
  const list = el('portfolio-list');
  if (!list) return;

  try {
    /* 1. операции пользователя */
    const r  = await fetch(TRADE_API, { credentials: 'include' });
    const js = await r.json();
    if (js.status !== 'success') throw new Error(js.message);

    /* 2. FIFO-остатки */
    const holdings = calculateHoldingsFIFO(js.trades);

    /* 3. дата первой покупки (ISO YYYY-MM-DD) */
    const firstBuyDate = js.trades
      .filter(t => t.op_type === 'buy')
      .map(t => t.purchase_date.slice(0, 10))
      .sort()[0];

    /* 4. актуальные цены бумаг */
    const prices = {};
    await Promise.all(Object.keys(holdings).map(async tk => {
      try { prices[tk] = await getCurrentPrice(tk); }
      catch { prices[tk] = 0; }
    }));

    /* 5. текущая стоимость портфеля, ₽ */
    const totalValue = Object.entries(holdings)
      .reduce((sum, [tk, h]) => sum + h.quantity * (prices[tk] ?? 0), 0);

    /* 6. визуализация портфеля */
    renderPortfolioPie(holdings, prices);
    renderPortfolioInfo(holdings, prices);

    /* 7. сколько вложено (BUY-сделки) */
    const totalCost = js.trades
      .filter(t => t.op_type === 'buy')
      .reduce((sum, t) => sum + t.quantity * parseFloat(t.price_per_share), 0);

    /* 8. сравнение с фондами с учётом даты первой покупки */
    const fundReport = await compareWithFunds(
      totalCost,
      FUND_TICKERS,
      firstBuyDate
    );

    /* 9. расчёт роста портфеля в процентах и формирование общей строки */
    const portfolioPct  = totalCost
      ? ((totalValue - totalCost) / totalCost * 100).toFixed(2)
      : '0.00';

    const portfolioRow = {
      label:       'Портфель',
      growthPct:   portfolioPct,
      finalValue:  totalValue.toFixed(2)
    };

    /* 10. объединяем, сортируем по росту (убывание) и выводим */
    const fullReport = [portfolioRow, ...fundReport]
      .sort((a, b) => {
        if (a.error) return 1;
        if (b.error) return -1;
        return parseFloat(b.growthPct) - parseFloat(a.growthPct);
      });

    renderFundsComparison(fullReport);

  } catch (err) {
    console.error('loadTradess:', err);
    list.textContent = 'Ошибка загрузки';
  }
}



  /* ================================================================
     7. История фонда (candles) с резервными base‑URL
     ================================================================ */
  async function loadFundHistory(ticker, from, till) {
    for (const base of BASES) {
      const url = `${base}/securities/${ticker}/candles.json?iss.meta=off&iss.only=candles&from=${from}&till=${till}&interval=24&limit=5000`;

      const r  = await fetch(url);
      if (!r.ok) continue;

      const js = await r.json();
      const c  = js.candles;
      if (!c?.data?.length) continue;

      const cols = c.columns.map(x => x.toLowerCase());
      const iD   = cols.indexOf('begin') !== -1 ? cols.indexOf('begin') : cols.indexOf('timestamp');
      const iC   = cols.indexOf('close') !== -1 ? cols.indexOf('close') : cols.indexOf('last');
      if (iD === -1 || iC === -1) continue;

      return c.data
              .map(r => ({ date: r[iD].slice(0, 10), nav: +r[iC] }))
              .filter(pt => !isNaN(pt.nav))
              .sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    throw new Error('нет данных');
  }

  /* ================================================================
     8. Сравнение портфеля с фондами (от даты первой покупки)
     ================================================================ */
  async function compareWithFunds(initialAmount, tickers, fromDate) {
    const till = new Date().toISOString().slice(0, 10);
    const results = [];

    for (const tk of tickers) {
      try {
        const hist = await loadFundHistory(tk, fromDate, till);
        if (!hist.length) throw new Error('нет данных');

        const start = hist.find(pt => pt.date >= fromDate) || hist[0];
        const end   = hist.at(-1);

        const growthPct = ((end.nav - start.nav) / start.nav * 100).toFixed(2);
        const finalVal  = (initialAmount * end.nav / start.nav).toFixed(2);

        results.push({ ticker: tk, since: start.date, growthPct, finalValue: finalVal });
      } catch (e) {
        results.push({ ticker: tk, error: e.message });
      }
    }
    return results;
  }

  /* ================================================================
     9. Главная функция загрузки/рендера
     ================================================================ */
  /* =========================  Загрузка портфеля  ========================= */
async function loadTradess() {
  const list = el('portfolio-list');
  if (!list) return;

  try {
    /* 1. операции пользователя */
    const r  = await fetch(TRADE_API, { credentials: 'include' });
    const js = await r.json();
    if (js.status !== 'success') throw new Error(js.message);

    /* 2. FIFO-остатки */
    const holdings = calculateHoldingsFIFO(js.trades);

    /* 3. дата первой покупки (ISO YYYY-MM-DD) */
    const firstBuyDate = js.trades
      .filter(t => t.op_type === 'buy')
      .map(t => t.purchase_date.slice(0, 10))
      .sort()[0];

    /* 4. актуальные цены бумаг */
    const prices = {};
    await Promise.all(Object.keys(holdings).map(async tk => {
      try { prices[tk] = await getCurrentPrice(tk); }
      catch { prices[tk] = 0; }
    }));

    /* 5. текущая стоимость портфеля, ₽ */
    const totalValue = Object.entries(holdings)
      .reduce((sum, [tk, h]) => sum + h.quantity * (prices[tk] ?? 0), 0);

    /* 6. визуализация портфеля */
    renderPortfolioPie(holdings, prices);
    renderPortfolioInfo(holdings, prices);

    /* 7. сколько вложено (BUY-сделки) */
    const totalCost = js.trades
      .filter(t => t.op_type === 'buy')
      .reduce((sum, t) => sum + t.quantity * parseFloat(t.price_per_share), 0);

    /* 8. сравнение с фондами с учётом даты первой покупки */
    const fundReport = await compareWithFunds(
      totalCost,
      FUND_TICKERS,
      firstBuyDate
    );

    /* 9. расчёт роста портфеля в процентах и формирование общей строки */
    const portfolioPct  = totalCost
      ? ((totalValue - totalCost) / totalCost * 100).toFixed(2)
      : '0.00';

    const portfolioRow = {
      label:       'Портфель',
      growthPct:   portfolioPct,
      finalValue:  totalValue.toFixed(2)
    };

    /* 10. объединяем, сортируем по росту (убывание) и выводим */
    const fullReport = [portfolioRow, ...fundReport]
      .sort((a, b) => {
        if (a.error) return 1;
        if (b.error) return -1;
        return parseFloat(b.growthPct) - parseFloat(a.growthPct);
      });

    renderFundsComparison(fullReport);

  } catch (err) {
    console.error('loadTradess:', err);
    list.textContent = 'Ошибка загрузки';
  }
}


  /* ================================================================
     10. Стартуем при появлении .portfolio-filter
     ================================================================ */
  new MutationObserver((_, obs) => {
    const panel = document.querySelector('.portfolio-filter');
    if (!panel || panel.dataset.inited) return;
    panel.dataset.inited = '1';
    loadTradess();
  }).observe(document.body, { childList: true, subtree: true });

})();
