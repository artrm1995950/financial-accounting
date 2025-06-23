


async function fetchTickers() {
  const resp = await fetch('https://iss.moex.com/iss/engines/stock/markets/shares/securities.json?iss.meta=off');
  const js   = await resp.json();
  const idx  = js.securities.columns.indexOf('SECID');
  const sel  = document.getElementById('ticker-select');
  js.securities.data.forEach(r => {
    const o = document.createElement('option');
    o.value = r[idx];
    o.text  = r[idx];
    sel.append(o);
  });
}

const ADD_COMMENT = 'content/add_comment.php';


let currentNickname = '';


fetch('get_user_profile.php', { credentials: 'include' })
  .then(r => r.ok ? r.json() : Promise.reject(r.status))
  .then(d => {
    currentNickname = d.nickname || d.full_name || 'Пользователь';
  })
  .catch(console.error);


async function loadChartData(ticker) {
  const years = [2022, 2023, 2024, new Date().getFullYear()];
  const all   = [];
  for (const y of years) {
    const from = `${y}-01-01`;
    const till = (y === new Date().getFullYear())
      ? new Date().toISOString().slice(0,10)
      : `${y}-12-31`;
    const url = `https://iss.moex.com/iss/engines/stock/markets/shares/securities/${ticker}/candles.json`
      + `?iss.only=candles&iss.meta=off&from=${from}&till=${till}&interval=24&limit=5000`;
    const resp = await fetch(url);
    const js   = await resp.json();
    const cols = js.candles.columns;
    const data = js.candles.data;
    const iD   = cols.indexOf('begin') >= 0 ? cols.indexOf('begin') : cols.indexOf('TIMESTAMP');
    const iC   = cols.indexOf('close') >= 0 ? cols.indexOf('close') : cols.indexOf('LAST');
    data.forEach(r => {
      const d = r[iD].slice(0,10);
      const c = parseFloat(r[iC]);
      if (!isNaN(c)) all.push({ date: d, close: c });
    });
  }
  return all.sort((a,b) => new Date(a.date) - new Date(b.date));
}


function filterByPeriod(data, period) {
  const end   = new Date();
  let   start = new Date(end);
  switch(period){
    case '1w': start.setDate(end.getDate()-7); break;
    case '1m': start.setMonth(end.getMonth()-1); break;
    case '6m': start.setMonth(end.getMonth()-6); break;
    case '1y': start.setFullYear(end.getFullYear()-1); break;
    case '2y': start.setFullYear(end.getFullYear()-2); break;
    case '3y': start.setFullYear(end.getFullYear()-3); break;
    case '4y':
    default:   start.setFullYear(end.getFullYear()-4); break;
  }
  return data.filter(i => {
    const d = new Date(i.date);
    return d >= start && d <= end;
  });
}

let chart, rawData = [];


function renderChart(ticker, data) {
  const labels = data.map(i => i.date);
  const vals   = data.map(i => i.close);
  const last   = vals.slice(-1)[0] || 0;
  const ts     = new Date().toLocaleString('ru-RU', {
    year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', second:'2-digit'
  });
  document.getElementById('chart-title').textContent =
    `${ticker}: ${last.toFixed(2)} ₽ (данные на ${ts})`;

  const ctx = document.getElementById('sberChart').getContext('2d');
  if (chart) chart.destroy();

  const vLine = {
    id: 'vLine',
    afterDraw(c) {
      const act = c.tooltip.getActiveElements();
      if (act.length) {
        const { ctx, chartArea: { top, bottom } } = c;
        const x = act[0].element.x;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.stroke();
        ctx.restore();
      }
    }
  };

  const endLabel = {
    id: 'endLabel',
    afterDatasetsDraw(chart) {
      const { ctx, data, chartArea: { right } } = chart;
      const ds   = data.datasets[0];
      const meta = chart.getDatasetMeta(0);
      if (!meta.data.length || !ds.data.length) return;
      const pt  = meta.data[meta.data.length - 1];
      const val = ds.data[ds.data.length - 1];
      if (typeof val !== 'number') return;

      ctx.save();
      ctx.fillStyle    = ds.borderColor;
      ctx.font         = '12px Arial';
      ctx.textBaseline = 'middle';
      ctx.fillText(val.toFixed(2), right + 8, pt.y);
      ctx.restore();
    }
  };

  chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ 
      data: vals,
      borderColor: '#7c3aed',
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 5,
      fill: true,
      backgroundColor: 'rgba(124,58,237,0.2)',
      tension: 0.1
    }]},
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode:'index', intersect:false },
      plugins: {
        tooltip: { mode:'index', intersect:false },
        legend: { display:false },
        zoom: { pan:{ enabled:true, mode:'x' }, zoom:{ wheel:{ enabled:true }, mode:'x' } }
      },
      scales: {
        x: { grid:{ display:false }, border:{ display:false }, ticks:{ display:false } },
        y: {
          grid:{ display:false }, border:{ display:false },
          title:{ display:true, text:'Цена, ₽' },
          ticks:{ callback:(v,i)=>(i===0?'':v) }
        }
      }
    },
    plugins: [vLine, endLabel]
  });

  document.getElementById('loading').style.display = 'none';
  document.getElementById('sberChart').hidden      = false;
}


async function updateChart() {
  const ticker   = document.getElementById('ticker-select').value;
  const activeBtn = document.querySelector('.period-btn.active');
  const period   = activeBtn ? activeBtn.dataset.period : '1m';

  document.getElementById('loading').textContent = 'Загрузка данных…';
  document.getElementById('loading').style.display = 'block';
  document.getElementById('sberChart').hidden      = true;

  rawData = await loadChartData(ticker);
  const filtered = filterByPeriod(rawData, period);

  if (!filtered.length) {
    document.getElementById('loading').textContent = 'Нет данных для ' + ticker;
    return;
  }

  renderChart(ticker, filtered);
}

async function loadComments() {
  const ticker = document.getElementById('ticker-select').value;
  const resp   = await fetch(`content/comments.php?ticker=${encodeURIComponent(ticker)}`, {
    credentials: 'include'
  });
  const list = await resp.json();
  const container = document.getElementById('comments-list');
  container.innerHTML = '';

  if (list.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#666;">Комментариев пока нет</p>';
    return;
  }

  list.forEach(c => {
    const item = document.createElement('div');
    item.className = 'comment-item';

    const meta = document.createElement('div');
    meta.className = 'meta';
    const date = new Date(c.created_at).toLocaleString('ru-RU', {
      day:'2-digit', month:'2-digit', year:'numeric',
      hour:'2-digit', minute:'2-digit'
    });
    meta.textContent = `${c.username} • ${date}`;

    const txt = document.createElement('div');
    txt.className = 'text';
    txt.textContent = c.text;

    item.append(meta, txt);
    container.append(item);
  });
}


async function initStockChart() {
  await fetchTickers();

  const sel       = document.getElementById('ticker-select');
  const input     = document.getElementById('ticker-input');
  const btn       = document.getElementById('ticker-btn');
  const submitBtn = document.getElementById('comment-submit');

  if ([...sel.options].some(o => o.value === 'SBER')) {
    sel.value = 'SBER';
  }

  async function refreshAll() {
    await updateChart();
    await loadComments();
  }

  sel.addEventListener('change', refreshAll);
  btn.addEventListener('click', () => {
    const tick = input.value.trim().toUpperCase();
    if (!tick) return alert('Введите тикер');
    if (![...sel.options].map(o => o.value).includes(tick)) {
      return alert(`Тикер "${tick}" не найден`);
    }
    sel.value = tick;
    refreshAll();
  });

  document.querySelectorAll('.period-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      refreshAll();
    });
  });
  document.querySelector('.period-btn[data-period="1y"]')?.classList.add('active');

  submitBtn.addEventListener('click', () => {
    const textEl = document.getElementById('comment-text');
    const anonEl = document.getElementById('comment-anon');
    const text   = textEl.value.trim();
    if (!text) return alert('Введите текст комментария');

    const username = anonEl.checked ? 'Анонимно' : currentNickname;
    const category = sel.value;

    const fd = new FormData();
    fd.append('username',     username);
    fd.append('message_text', text);
    fd.append('category',     category);

    fetch(ADD_COMMENT, {
      method: 'POST',
      credentials: 'include',
      body: fd
    })
    .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
    .then(d => {
      if (d.status === 'success') {
        textEl.value = '';
        refreshAll();
      } else {
        alert('Ошибка: ' + d.message);
      }
    })
    .catch(() => alert('Не удалось отправить комментарий'));
  });

  await refreshAll();
}


const obs = new MutationObserver(() => {
  const sec = document.querySelector('.stock-chart');
  if (sec && !sec.dataset.inited) {
    sec.dataset.inited = '1';
    initStockChart();
  }
});
obs.observe(document.body, { childList: true, subtree: true });
