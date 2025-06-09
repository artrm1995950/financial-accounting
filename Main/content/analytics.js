// Ежедневный график остаётся, но без прогноза. Месячный график теперь строит прогноз на 3 месяца вперёд.
const STATEMENTS_URL  = 'content/get_statements_fullpath.php';
const MANUAL_OPS_URL  = 'content/manuals_opertions/get_manual_operations.php';

let ALL_TRANSACTIONS      = [];
let TOTAL_REMAINDER       = 0;
let categoryChartInstance = null;
let dailyChartInstance    = null;
const MONTH_NAMES = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
const MONTH_NAMES_NOMINATIVE = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

const analyticsObserver = new MutationObserver(() => {
  const applyBtn = document.getElementById('applyFilter');
  if (applyBtn && !applyBtn.dataset.inited) {
    applyBtn.dataset.inited = '1';
    initAnalytics();
  }
});
analyticsObserver.observe(document.body, { childList: true, subtree: true });

async function initAnalytics() {
  const errEl = document.getElementById('analytics-error');
  errEl.textContent = '';

  try {
    await loadAllStatements();
    await loadManualOperations();
    await renderMonthlyForecastChart();
    await renderIncomeVsExpenseChart();
    await renderIncomeVsExpenseBarChart();

  } catch (e) {
    errEl.textContent = 'Ошибка загрузки данных: ' + e.message;
    return;
  }

  document.getElementById('applyFilter')
          .addEventListener('click', renderChartAnalytics);

  const today = new Date().toISOString().slice(0,10);
  document.getElementById('endDate').value = today;
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  document.getElementById('startDate').value = monthAgo.toISOString().slice(0,10);

  renderChartAnalytics();
}

async function loadAllStatements() {
  const resp = await fetch(STATEMENTS_URL, { credentials: 'include' });
  const json = await resp.json();
  if (json.status !== 'success') throw new Error(json.message);
  const statements = json.statements;

  TOTAL_REMAINDER = 0;
  const all = [];

  for (const stmt of statements) {
    try {
      const { transactions, remainderValue } = await parseAndReturn(stmt.id, stmt.bank);
      all.push(...transactions.map(tx => ({
        date: formatDateDotToISO(tx.дата),
        category: tx.категория,
        amount: tx.сумма,
        type: tx.тип === '-' ? 'expense' : 'income'
      })));
      if (typeof remainderValue === 'number') {
        TOTAL_REMAINDER += remainderValue;
      }
    } catch (_) {}
  }

  ALL_TRANSACTIONS = all;
}async function renderIncomeVsExpenseBarChart() {
  const MONTH_NAMES_PREPOSITIONAL = [
  'январе', 'феврале', 'марте', 'апреле', 'мае', 'июне',
  'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'
];

  const expenses = ALL_TRANSACTIONS.filter(tx => tx.type === 'expense' && tx.date && tx.amount);
  const incomes  = ALL_TRANSACTIONS.filter(tx => tx.type === 'income'  && tx.date && tx.amount);

  const all = [...expenses.map(tx => ({ ...tx, type: 'expense' })), ...incomes.map(tx => ({ ...tx, type: 'income' }))];
  const df = all.map(tx => ({
    month: tx.date.slice(0, 7),
    type: tx.type,
    category: tx.category || 'Без категории',
    amount: tx.amount
  }));

  const grouped = {};
  for (const row of df) {
    if (!grouped[row.month]) grouped[row.month] = { expense: 0, income: 0 };
    grouped[row.month][row.type] += row.amount;
  }

  const rawLabels = Object.keys(grouped).sort();
  const labels = rawLabels.map(m => {
  const [year, month] = m.split('-');
  return `в ${MONTH_NAMES_PREPOSITIONAL[Number(month) - 1]} ${year}`;
});


  const expensesByMonth = rawLabels.map(m => Math.abs(grouped[m].expense || 0));
  const incomeByMonth   = rawLabels.map(m => grouped[m].income || 0);

  const canvas = document.getElementById('incomeVsExpenseBarChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Доходы',
          data: incomeByMonth,
          backgroundColor: 'rgba(0, 128, 0, 0.6)'
        },
        {
          label: 'Расходы',
          data: expensesByMonth,
          backgroundColor: 'rgba(255, 99, 132, 0.6)'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: '₽' }
        },
        x: {
          title: { display: true, text: 'Месяц' }
        }
      }
    }
  });

  // Аналитика по каждому месяцу
  const summaryEl = document.getElementById('analytics-summary');
  summaryEl.innerHTML = '';

  for (let i = 0; i < rawLabels.length; i++) {
    const month = rawLabels[i];
    const label = labels[i];

    const monthExpenses = df.filter(row => row.type === 'expense' && row.month === month);
    const monthTotal = monthExpenses.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const byCategory = {};
    for (const tx of monthExpenses) {
      const cat = tx.category || 'Без категории';
      byCategory[cat] = (byCategory[cat] || 0) + Math.abs(tx.amount);
    }

    let topCategory = 'Без категории';
    let max = 0;
    for (const cat in byCategory) {
      if (byCategory[cat] > max) {
        max = byCategory[cat];
        topCategory = cat;
      }
    }

    const p = document.createElement('p');
    p.textContent = ` ${label} вы потратили ${monthTotal.toLocaleString('ru-RU')} ₽. Самая большая категория — ${topCategory}.`;
    summaryEl.appendChild(p);
  }
}



function addNextMonthLabel(currentMonthStr, offset = 1) {
  const [year, month] = currentMonthStr.split('-').map(Number);
  const d = new Date(year, month - 1 + offset);
  return d.toISOString().slice(0, 7);
}

async function loadManualOperations() {
  const resp = await fetch(MANUAL_OPS_URL, { credentials: 'include' });
  const json = await resp.json();
  if (json.status !== 'success') throw new Error(json.message);

  const ops = json.operations.map(o => ({
    date: o.date,
    category: o.category,
    amount: parseFloat(o.amount),
    type: o.type
  }));

  ALL_TRANSACTIONS.push(...ops);
}

function formatDateDotToISO(dotDate) {
  const [d,m,y] = dotDate.split('.').map(Number);
  return new Date(y, m-1, d).toISOString().slice(0,10);
}

function renderChartAnalytics() {
  const errEl = document.getElementById('analytics-error');
  const canvasEl = document.getElementById('categoryChart');
  errEl.textContent = '';

  const startVal = document.getElementById('startDate').value;
  const endVal   = document.getElementById('endDate').value;
  if (!startVal || !endVal) {
    errEl.textContent = 'Укажите обе даты.';
    return;
  }
  const startDate = new Date(startVal);
  const endDate   = new Date(endVal);
  if (endDate < startDate) {
    errEl.textContent = 'Дата конца раньше даты начала.';
    return;
  }

  const filtered = ALL_TRANSACTIONS.filter(tx => {
    if (!tx.date) return false;
    const dt = new Date(tx.date);
    return dt >= startDate && dt <= endDate;
  });

  if (filtered.length === 0) return;

  const totalSpent = filtered
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totals = {};
  filtered.filter(tx => tx.type === 'expense').forEach(tx => {
    const cat = tx.category || 'Без категории';
    totals[cat] = (totals[cat] || 0) + tx.amount;
  });

  const labels = Object.keys(totals);
  const data = labels.map(l => totals[l]);

  if (categoryChartInstance) categoryChartInstance.destroy();
  categoryChartInstance = new Chart(canvasEl.getContext('2d'), {
    type: 'pie',
    data: { labels, datasets: [{ data }] },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'right' },
        tooltip: {
          callbacks: {
            label: ctx => {
              const val = ctx.parsed;
              const sum = data.reduce((a,b) => a + b, 0);
              const pct = (val / sum * 100).toFixed(1) + '%';
              return `${ctx.label}: ${val.toLocaleString('ru-RU')} ₽ (${pct})`;
            }
          }
        }
      }
    }
  });

  document.getElementById('total-spent').textContent =
    `Траты за период: ${totalSpent.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽`;
  document.getElementById('total-remainder').textContent =
    `Общий остаток по всем выпискам: ${TOTAL_REMAINDER.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽`;

  renderDailyChart(filtered);
}

async function renderDailyChart(filtered) {
  const sumsByDate = {};
  filtered.filter(tx => tx.type === 'expense').forEach(tx => {
    const key = tx.date;
    sumsByDate[key] = (sumsByDate[key] || 0) + tx.amount;
  });

  const labels = Object.keys(sumsByDate).sort();
  const data = labels.map(d => sumsByDate[d]);

  const ctx = document.getElementById('dailyChart').getContext('2d');
  if (dailyChartInstance) dailyChartInstance.destroy();

  dailyChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Траты в день, ₽',
          data,
          borderColor: 'blue',
          fill: true,
          tension: 0.2,
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'time',
          time: {
            parser: 'YYYY-MM-DD',
            unit: 'day',
            displayFormats: { day: 'DD.MM.YYYY' },
            tooltipFormat: 'DD.MM.YYYY'
          },
          title: { display: true, text: 'Дата' }
        },
        y: {
          title: { display: true, text: 'Сумма, ₽' }
        }
      },
      plugins: { legend: { position: 'top' } }
    }
  });
}
async function renderIncomeVsExpenseChart() {
  const expenses = ALL_TRANSACTIONS.filter(tx => tx.type === 'expense' && tx.date && tx.amount);
  const incomes  = ALL_TRANSACTIONS.filter(tx => tx.type === 'income'  && tx.date && tx.amount);

  const all = [...expenses.map(tx => ({ ...tx, type: 'expense' })), ...incomes.map(tx => ({ ...tx, type: 'income' }))];
  const df = all.map(tx => ({
    month: tx.date.slice(0, 7),
    type: tx.type,
    amount: tx.amount
  }));

  const grouped = {};
  for (const row of df) {
    if (!grouped[row.month]) grouped[row.month] = { expense: 0, income: 0 };
    grouped[row.month][row.type] += row.amount;
  }

  const rawLabels = Object.keys(grouped).sort();
  const labels = rawLabels.map(m => {
    const [year, month] = m.split('-');
    return `${MONTH_NAMES_NOMINATIVE[Number(month) - 1]} ${year}`;
  });

  const expensesByMonth = rawLabels.map(m => Math.abs(grouped[m].expense || 0));
  const incomeByMonth   = rawLabels.map(m => grouped[m].income || 0);

  const ctx = document.getElementById('incomeVsExpenseChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Доходы',
          data: incomeByMonth,
          borderColor: 'green',
          backgroundColor: 'rgba(0,128,0,0.1)',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 4,
          fill: false
        },
        {
          label: 'Расходы',
          data: expensesByMonth,
          borderColor: 'red',
          backgroundColor: 'rgba(255,0,0,0.1)',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 4,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' }
      },
      scales: {
        y: {
          title: { display: true, text: '₽' }
        },
        x: {
          title: { display: true, text: 'Месяц' }
        }
      }
    }
  });
  generateTrendSummary(labels, incomeByMonth, expensesByMonth);

}

function addNextMonthLabel(currentMonthStr, offset = 1) {
  const [year, month] = currentMonthStr.split('-').map(Number);
  const d = new Date(year, month - 1 + offset);
  return d.toISOString().slice(0, 7);
}
async function renderMonthlyForecastChart() {

  const expenses = ALL_TRANSACTIONS
    .filter(tx => tx.type === 'expense' && tx.date && tx.amount)
    .map(tx => ({
      date: tx.date,
      amount: Math.abs(tx.amount)
    }));

  const res = await fetch('http://localhost:5002/forecast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expenses })
  });

  const result = await res.json();
  const history = result.history;
  const forecast = result.forecast;

  // Функция для форматирования "2025-01" → "Январь 2025"
  const formatMonth = str => {
    const [year, month] = str.split('-');
    return `${MONTH_NAMES[+month - 1]} ${year}`;
  };

  const labels = history.map(m => formatMonth(m.month_str));
  const values = history.map(m => m.amount);

  const forecastLabels = forecast.map((_, i) => {
    const [lastYear, lastMonth] = history[history.length - 1].month_str.split('-').map(Number);
    const d = new Date(lastYear, lastMonth - 1 + i + 1);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const y = d.getFullYear();
    return formatMonth(`${y}-${m}`);
  });

  const forecastValues = forecast;

  const allLabels = [...labels, ...forecastLabels];
  const historyLine = [...values, ...Array(forecast.length).fill(null)];
  const forecastLine = [...Array(values.length).fill(null), ...forecastValues];

  const ctx = document.getElementById('monthlyChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: allLabels,
      datasets: [
        {
          label: 'Сумма трат по месяцам',
          data: historyLine,
          borderColor: '#0066cc',
          backgroundColor: 'rgba(0, 102, 204, 0.1)',
          borderWidth: 3,
          pointRadius: 4,
          fill: false,
          tension: 0.4
        },
        {
          label: 'Прогноз на следующие месяцы',
          data: forecastLine,
          borderColor: '#ff9933',
          backgroundColor: 'rgba(255, 153, 51, 0.1)',
          borderWidth: 3,
          pointRadius: 5,
          fill: false,
          tension: 0.4
        }
      ]
    },
    options: {
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: { size: 14 },
            color: '#333'
          }
        }
      },
      scales: {
        x: {
          ticks: { font: { size: 12 }, color: '#444' }
        },
        y: {
          title: {
            display: true,
            text: '₽',
            font: { size: 14 },
            color: '#444'
          },
          ticks: { font: { size: 12 }, color: '#444' }
        }
      }
    }
  });

  const ctx2 = document.getElementById('barForecastChart').getContext('2d');
  new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: allLabels,
      datasets: [
        {
          label: 'Траты',
          data: historyLine,
          backgroundColor: 'rgba(0, 102, 204, 0.6)'
        },
        {
          label: 'Прогноз',
          data: forecastLine,
          backgroundColor: 'rgba(255, 153, 51, 0.6)'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' }
      },
      scales: {
        x: { stacked: true },
        y: {
          stacked: true,
          title: { display: true, text: '₽' }
        }
      }
    }
  });
}


function addNextMonthLabel(currentMonthStr, offset = 1) {
  const [year, month] = currentMonthStr.split('-').map(Number);
  const d = new Date(year, month - 1 + offset);
  return d.toISOString().slice(0, 7);
}


function addNextMonthLabel(currentMonthStr, offset = 1) {
  const [year, month] = currentMonthStr.split('-').map(Number);
  const d = new Date(year, month - 1 + offset);
  return d.toISOString().slice(0, 7);
}

async function getForecastFromServer(expenses) {
  try {
    const res = await fetch('http://localhost:5002/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenses })
    });

    const contentType = res.headers.get('Content-Type') || '';
    const text = await res.text();

    if (!res.ok) throw new Error(text);
    if (!contentType.includes('application/json')) throw new Error('Не JSON');

    return JSON.parse(text).forecast;
  } catch (err) {
    console.error('Ошибка прогноза:', err);
    return [];
  }
}



// Парсит PDF и возвращает { transactions, remainderValue }
async function parseAndReturn(id, bank) {
  const resp = await fetch(`content/download_statement.php?id=${id}`, { credentials: 'include' });
  if (!resp.ok) throw new Error(resp.statusText);
  const buffer = await resp.arrayBuffer();

  const pdf = await pdfjsLib.getDocument(new Uint8Array(buffer)).promise;
  const pages = await Promise.all(
    Array.from({ length: pdf.numPages }, (_, i) =>
      pdf.getPage(i+1)
         .then(p => p.getTextContent())
         .then(tc => tc.items.map(it => it.str).join(' '))
    )
  );
  const fullText = pages.join('\n');

  let transactions, remainderValue = null;
  switch (bank.toLowerCase()) {
    case 'akbars':
      ({ transactions, remainderValue } = extractAkBarsTransactionsWithRemainder(fullText));
      break;
    case 'ozon':
      ({ transactions, remainderValue } = extractOzonTransactionsWithRemainder(fullText));
      break;
    case 'tinkoff':
      transactions = extractTbankTransactions(fullText);
      break;
    case 'sber':
      ({ transactions, remainderValue } = extractSberTransactionsWithRemainder(fullText));
      break;
    case 'yandex':
      ({ transactions, remainderValue } = extractYandexTransactionsWithRemainder(fullText));
      break;
    default:
      throw new Error(`Нет парсера для банка "${bank}"`);
  }
  return { transactions, remainderValue };
}




function extractAkBarsRemainder(text) {
  // Приводим весь текст в одну строку, убирая переводы строк и лишние пробелы
  const singleLineText = text.replace(/\n/g, ' ')
                             .replace(/\r/g, ' ')
                             .replace(/\s+/g, ' ');
  // Регулярное выражение ищет фразу "Остаток на конец периода" с любыми пробелами вокруг двоеточия
  // и затем захватывает число, которое может содержать пробелы (разделители тысяч) и запятую как десятичный разделитель.
  const remainderRegex = /Остаток\s+на\s+конец\s+периода\s*:\s*([\d\s,\.]+)/i;
  const remMatch = singleLineText.match(remainderRegex);
  
  if (remMatch) {
    // Удаляем пробелы, заменяем запятую на точку и преобразуем в число
    return parseFloat(remMatch[1].replace(/\s/g, '').replace(',', '.'));
  } else {
    return null;
  }
}

function extractAkBarsTransactionsWithRemainder(text) {
  // Функция simplifyAkBarsTransactions уже извлекает операции из выписки Ак Барс
  const transactions = simplifyAkBarsTransactions(text);
  const remainderValue = extractAkBarsRemainder(text);
  
  return {
    transactions: transactions,
    remainderDate: null, // в данном случае не берем дату
    remainderValue: remainderValue
  };
}





  
  
  

  

// Функция для извлечения транзакций из выписки ОЗОН
function extractOzonTransactions(text) {
  const transactions = [];
  // Объединяем весь текст в одну строку, убирая переводы строк и лишние пробелы
  const singleLineText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  
  // Регулярное выражение:
  // 1-я группа: дата операции (формат DD.MM.YYYY)
  // 2-я группа: время операции (формат HH:MM:SS) – не используется
  // 3-я группа: номер документа – не используется
  // 4-я группа: описание операции (нежадно, до суммы)
  // 5-я группа: знак суммы (+ или -)
  // 6-я группа: сумма (цифры, пробелы, запятая или точка)
  // Lookahead проверяет, что после суммы идет либо новая транзакция (следующая дата),
  // либо слово "Итого", либо конец строки.
  const regex = /(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2}:\d{2})\s+(\d+)\s+(.*?)\s+([+-])\s*([\d\s,.]+)(?=\s+(?:\d{2}\.\d{2}\.\d{4}|Итого|$))/g;
  
  let match;
  while ((match = regex.exec(singleLineText)) !== null) {
    const date        = match[1];
    const description = match[4].trim();
    const type        = match[5]; // сохраняем знак: "+" или "-"
    let rawAmount     = match[6].replace(/\s/g, '').replace(',', '.');
    const amount      = Math.abs(parseFloat(rawAmount));
    
    // Новая логика определения категории
    const descUpper = description.toUpperCase();
    let category;
    if (
      descUpper.includes("PYATEROCHKA") ||
      descUpper.includes("ПЯТЕРОЧКА") ||
      descUpper.includes("MAGAZIN") ||
      descUpper.includes("PRODUCT") ||
      descUpper.includes("MAGNIT") ||
      descUpper.includes("МАГАЗИН")
    ) {
      category = "Супермаркет";
    } else if (descUpper.includes("ПЕРЕВОД НА КАРТУ") || /перевод/i.test(description)) {
      category = "Перевод с карты";
    } else if (
  descUpper.includes("ПЕРЕВОД НА КАРТУ") ||
  /перевод/i.test(description) ||
  /зачисление средств/i.test(description)
) {
  category = "Перевод с карты";
    } else if (
      descUpper.includes("CAFE") ||
      descUpper.includes("RESTAURANT") ||
      descUpper.includes("КОФЕ") ||
      descUpper.includes("РЕСТОРАН")
    ) {
      category = "Рестораны и кафе";
    } else if (/оплата товаров\/услуг/i.test(description)) {
      category = "Оплата товаров ОЗОН";
    } else {
      category = "Прочие расходы";
    }

    transactions.push({
      дата:      date,
      категория: category,
      сумма:     amount,
      тип:       type
    });
  }
  return transactions;
}



// Функция для извлечения транзакций и остатка из выписки ОЗОН
function extractOzonTransactionsWithRemainder(text) {
  const transactions = extractOzonTransactions(text);
  
  // Приводим весь текст к одной строке
  const singleLineText = text.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ');
  
  // Извлекаем дату конца периода из строки "Период выписки: 28.03.2025 – 04.04.2025"
  let remainderDate = null;
  const periodRegex = /Период выписки:\s*\d{2}\.\d{2}\.\d{4}\s*[–-]\s*(\d{2}\.\d{2}\.\d{4})/i;
  const periodMatch = singleLineText.match(periodRegex);
  if (periodMatch) {
    remainderDate = periodMatch[1]; // будет, например, "04.04.2025"
  }
  
  // Извлекаем итоговый остаток из строки "Исходящий остаток: <число> ₽"
  let remainderValue = null;
  const remainderRegex = /Исходящий остаток:\s*([\d\s,\.]+)\s*₽/i;
  const remMatch = singleLineText.match(remainderRegex);
  if (remMatch) {
    remainderValue = parseFloat(remMatch[1].replace(/\s/g, '').replace(',', '.'));
  }
  
  return {
    transactions: transactions,
    remainderDate: remainderDate,
    remainderValue: remainderValue
  };
}


  
  
  
  
function extractTbankTransactions(text) {
  const transactions = [];
  // Преобразуем весь текст в одну строку, удаляя переводы строк и лишние пробелы
  const singleLineText = text.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ');
  
  // Регулярное выражение:
  // 1-я группа: дата операции (формат DD.MM.YYYY) – не используется далее
  // 2-я группа: дата списания (будет использоваться как дата транзакции)
  // 3-я группа: сумма операции (с возможным знаком, цифры, пробелы, запятая или точка)
  // 4-я группа: описание операции (до следующей даты или до конца строки)
  // Lookahead: после описания должна идти новая транзакция (следующая дата) или конец строки
  const regex = /(\d{2}\.\d{2}\.\d{4})\s+\d{2}:\d{2}\s+(\d{2}\.\d{2}\.\d{4})\s+\d{2}:\d{2}\s+([+-]?[\d\s,\.]+\d)\s+₽\s+[+-]?[\d\s,\.]+\d\s+₽\s+(.+?)(?=\s+\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}|$)/g;
  
  let match;
  while ((match = regex.exec(singleLineText)) !== null) {
    // Используем дату списания как дату транзакции
    const date = match[2];
    // Получаем строковое значение суммы (с возможным знаком)
    const rawAmount = match[3].trim();
    // Определяем тип транзакции: если первым символом является "-", то тип "-", иначе "+"
    const type = rawAmount[0] === '-' ? '-' : '+';
    // Преобразуем сумму в число, убираем пробелы, заменяем запятую на точку и берём абсолютное значение
    const amount = Math.abs(parseFloat(rawAmount.replace(/\s/g, '').replace(',', '.')));
    
    // Извлекаем описание операции
    const description = match[4].trim();
    
    // По умолчанию категория "Прочие операции"
    let category = "Прочие расходы";
    // Логика определения категории:
    if (/Magazin Producty/i.test(description)) {
      category = "Супермаркеты";
    } else if (/KAZANMETRO|metro/i.test(description)) {
      category = "Транспорт";
    } else if (/Пополнение/i.test(description) || /Внутренний перевод на договор/i.test(description)) {
      category = "Перевод с карты";
    } else if (/Оплата/i.test(description)) {
      category = "Прочие расходы";
    }
    
    transactions.push({
      дата: date,
      сумма: amount,
      тип: type,
      категория: category
    });
  }
  
  return transactions;
}

  
  




function extractSberTransactions(text) {
  const transactions = [];
  // Приводим весь текст к одной строке (убираем переводы строк и лишние пробелы)
  const singleLineText = text.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ');
  
  // Регулярное выражение для операций:
  // Группа 1 – дата операции (например, "28.02.2025")
  // Группа 2 – категория (например, "Прочие операции" или "Прочие расходы")
  // Группа 3 – сумма операции (с опциональным знаком, с разделителями, например, "+40 000,00" или "400,00")
  const txRegex = /(\d{2}\.\d{2}\.\d{4})\s+\d{2}:\d{2}\s+\d+\s+([А-Яа-я\s]+)\s+([+-]?[\d]{1,3}(?:[\s,]\d{3})*(?:,\d{2})?)/g;
  
  let match;
  while ((match = txRegex.exec(singleLineText)) !== null) {
    const date = match[1];
    const category = match[2].trim();
    const rawAmount = match[3].trim();
    
    // Если сумма начинается с "+" – тип "+", иначе (если с "-" или без знака) "-".
    const type = rawAmount[0] === '+' ? '+' : '-';
    const amount = Math.abs(parseFloat(rawAmount.replace(/\s/g, '').replace(',', '.')));
    
    transactions.push({
      дата: date,
      сумма: amount,
      тип: type,
      категория: category
    });
  }
  return transactions;
}

function extractSberTransactionsWithRemainder(text) {
  // Сначала извлекаем транзакции (с использованием вашей функции)
  const transactions = extractSberTransactions(text);
  
  let remainderDate = null;
  let remainderValue = null;
  
  // Приводим весь текст к одной строке — убираем переводы строк и лишние пробелы
  const singleLineText = text.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ');
  
  // Новое регулярное выражение для остатка:
  // Оно ищет фразу "ОСТАТОК НА", затем дату (группа 1) в формате DD.MM.YYYY,
  // а затем группу чисел (группа 2), где числа имеют формат, например, "29 550,53"
  const remainderRegex = /ОСТАТОК НА\s+(\d{2}\.\d{2}\.\d{4})\s+((?:\d{1,3}(?:[\s,]\d{3})*(?:,\d{2})?\s*)+)/i;
  const remMatch = singleLineText.match(remainderRegex);
  
  if (remMatch) {
    remainderDate = remMatch[1]; // Например: "28.02.2025"
    // Из группы 2 извлекаем все числа, соответствующие формату денежных сумм
    const numbers = remMatch[2].match(/\d{1,3}(?:[\s,]\d{3})*(?:,\d{2})?/g);
    if (numbers && numbers.length > 0) {
      // Итоговый остаток – последнее число из найденных
      const lastNumberStr = numbers[numbers.length - 1];
      remainderValue = parseFloat(lastNumberStr.replace(/\s/g, '').replace(',', '.'));
    }
  }
  
  return {
    transactions: transactions,
    remainderDate: remainderDate,
    remainderValue: remainderValue
  };
}







function displayTransactions(transactions, outputId) {
    const output = document.getElementById(outputId);
    output.innerHTML = "<h3>Траты из выписки:</h3>";
    output.innerHTML += `<pre>${JSON.stringify(transactions, null, 2)}</pre>`;
}


function extractYandexTransactions(text) {
  const transactions = [];
  // Приводим текст к одной строке — удаляем переводы строк, лишние пробелы и неразрывные пробелы
  const singleLineText = text.replace(/[\n\r]/g, ' ').replace(/[\s\u00A0]+/g, ' ');

  const regex = /(.+?)\s+(\d{2}\.\d{2}\.\d{4})\s+в\s+(\d{2}:\d{2})\s+(\d{2}\.\d{2}\.\d{4})\s+([\+\-\u2013\u2014])\s*([\d\s,\.]+)\s*₽/gi;
  
  let match;
  while ((match = regex.exec(singleLineText)) !== null) {
    const descriptionText = match[1].trim();
    const transactionDate = match[4];
    let type = match[5];
    if (type === '–' || type === '—') type = '-';
    const amount = Math.abs(parseFloat(
      match[6].replace(/[\s\u00A0]/g, '').replace(',', '.')
    ));
    
    const descUpper = descriptionText.toUpperCase();
    let category;
    if (
      descUpper.includes("PYATEROCHKA") ||
      descUpper.includes("ПЯТЕРОЧКА") ||
      descUpper.includes("MAGAZIN") ||
      descUpper.includes("PRODUCT") ||
      descUpper.includes("MAGNIT") ||
      descUpper.includes("МАГАЗИН")
    ) {
      category = "Супермаркет";
    } else if (
      descUpper.includes("ВХОДЯЩИЙ ПЕРЕВОД") ||
      descUpper.includes("ПЕРЕВОД ")
    ) {
      category = "Перевод с карты";
    } else if (
      descUpper.includes("CAFE") ||
      descUpper.includes("RESTAURANT") ||
      descUpper.includes("РЕСТОРАН")
    ) {
      category = "Рестораны и кафе";
    } else {
      category = "Прочие расходы";
    }

    transactions.push({
      дата:      transactionDate,
      сумма:     amount,
      тип:       type,
      категория: category
    });
  }
  
  return transactions;
}

function extractYandexRemainder(text) {
  // Приводим текст к одной строке, убираем возможные неразрывные пробелы
  const singleLineText = text.replace(/\n/g, ' ')
                             .replace(/\r/g, ' ')
                             .replace(/[\s\u00A0]+/g, ' ');
  
  let remainderDate = null;
  let remainderValue = null;
  
  // Ищем строку "Исходящий остаток за 12.04.2025 7 038,12 ₽"
  // Группа 1: дата, Группа 2: сумма
  const remainderRegex = /Исходящий\s+остаток\s+за\s+(\d{2}\.\d{2}\.\d{4})\s+([\d\s\u00A0,\.]+)\s*₽/i;
  const m = singleLineText.match(remainderRegex);
  if (m) {
    remainderDate = m[1];
    remainderValue = parseFloat(
      m[2].replace(/[\s\u00A0]/g, '').replace(',', '.')
    );
  }
  
  return { remainderDate, remainderValue };
}

function extractYandexTransactionsWithRemainder(text) {
  // Сначала находим позицию, где начинается вторая выписка
  // "В рамках Договора открыт счёт"
  const keyword = "В рамках Договора открыт счёт";
  const idx = text.indexOf(keyword);
  
  // Если фраза не найдена, возвращаем пустые результаты
  if (idx === -1) {
    return {
      transactions: [],
      remainderDate: null,
      remainderValue: null
    };
  }
  
  // Берем подстроку от этой фразы до конца, чтобы обработать только вторую выписку
  const relevantText = text.substring(idx);
  
  // Извлекаем операции и остаток только из этой части
  const transactions = extractYandexTransactions(relevantText);
  const remainder = extractYandexRemainder(relevantText);
  
  return {
    transactions: transactions,
    remainderDate: remainder.remainderDate,
    remainderValue: remainder.remainderValue
  };
}
function generateTrendSummary(labels, incomeData, expenseData) {
  const summaryEl = document.getElementById('trend-summary');
  if (!summaryEl) return;

  summaryEl.innerHTML = ''; // Очистка

  const addText = (type, change, month) => {
    const action = change > 0 ? 'выросли' : 'упали';
    const percent = Math.abs(change).toFixed(1);
    const text = `${type === 'Доходы' ? 'Доходы' : 'Расходы'} ${action} на ${percent}% в ${month}`;
    const p = document.createElement('p');
    p.textContent = text;
    summaryEl.appendChild(p);
  };

  for (let i = 1; i < labels.length; i++) {
    const prev = incomeData[i - 1], curr = incomeData[i];
    if (prev > 0) {
      const diff = ((curr - prev) / prev) * 100;
      if (Math.abs(diff) >= 10) {
        addText('Доходы', diff, labels[i]);
      }
    }

    const prevExp = expenseData[i - 1], currExp = expenseData[i];
    if (prevExp > 0) {
      const diffExp = ((currExp - prevExp) / prevExp) * 100;
      if (Math.abs(diffExp) >= 10) {
        addText('Расходы', diffExp, labels[i]);
      }
    }
  }
}

