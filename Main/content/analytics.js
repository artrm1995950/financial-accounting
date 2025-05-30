const STATEMENTS_URL  = 'content/get_statements_fullpath.php';
const MANUAL_OPS_URL  = 'content/manuals_opertions/get_manual_operations.php';

let ALL_TRANSACTIONS      = [];  // сюда сохраняются и выписки, и ручные операции
let TOTAL_REMAINDER       = 0;
let categoryChartInstance = null;
let dailyChartInstance    = null;

// Ждём появления кнопки «Показать» и инициализируем
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
    // 1) Загрузить и спарсить все выписки
    await loadAllStatements();
    // 2) Загрузить ручные операции и добавить в общий массив
    await loadManualOperations();
  } catch (e) {
    errEl.textContent = 'Ошибка загрузки данных: ' + e.message;
    return;
  }

  // 3) Навесить обработчик на кнопку фильтра
  document.getElementById('applyFilter')
          .addEventListener('click', renderChartAnalytics);

  // 4) Установить дефолтные даты (месяц назад и сегодня)
  const today = new Date().toISOString().slice(0,10);
  document.getElementById('endDate').value   = today;
  const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
  document.getElementById('startDate').value = monthAgo.toISOString().slice(0,10);

  // 5) Первичная отрисовка
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
        // Переводим поля транзакции в единый формат (русские названия → англ.)
        date:      formatDateDotToISO(tx.дата),
        category:  tx.категория,
        amount:    tx.сумма,
        type:      tx.тип === '-' ? 'expense' : 'income'
      })));
      if (typeof remainderValue === 'number') {
        TOTAL_REMAINDER += remainderValue;
      }
    } catch (_) { /* пропускаем нераспаршенные */ }
  }

  ALL_TRANSACTIONS = all;
}

async function loadManualOperations() {
  const resp = await fetch(MANUAL_OPS_URL, { credentials: 'include' });
  const json = await resp.json();
  if (json.status !== 'success') throw new Error(json.message);

  // Добавляем ручные операции прямо в массив
  const ops = json.operations.map(o => ({
    date:     o.date,      // ожидаем YYYY-MM-DD
    category: o.category,
    amount:   parseFloat(o.amount),
    type:     o.type       // 'expense' или 'income'
  }));

  ALL_TRANSACTIONS.push(...ops);
}

// Преобразование «дд.мм.гггг» → «YYYY-MM-DD»
function formatDateDotToISO(dotDate) {
  const [d,m,y] = dotDate.split('.').map(Number);
  return new Date(y, m-1, d).toISOString().slice(0,10);
}

function renderChartAnalytics() {
  const errEl    = document.getElementById('analytics-error');
  const canvasEl = document.getElementById('categoryChart');
  errEl.textContent = '';

  // 1) Читаем диапазон дат
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

  // 2) Фильтрация транзакций по диапазону
const filtered = ALL_TRANSACTIONS.filter(tx => {
    // если у элемента нет date — пропускаем
    if (!tx.date) return false;
    const dt = new Date(tx.date); 
    return dt >= startDate && dt <= endDate;
  });

  if (filtered.length === 0) {
    // … ваш код для пустого диапазона …
  }

  // 3) Считаем общие траты за период (только «-» операции)
  const totalSpent = filtered
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // 4) Агрегация по категориям (только «-» операции)
  const totals = {};
  filtered
    .filter(tx => tx.type === 'expense')
    .forEach(tx => {
      const cat = tx.category || 'Без категории';
      totals[cat] = (totals[cat] || 0) + tx.amount;
    });

const labels = Object.keys(totals);
const data   = labels.map(l => totals[l]);

// 5) Перерисовка круговой диаграммы
if (categoryChartInstance) categoryChartInstance.destroy();
categoryChartInstance = new Chart(canvasEl.getContext('2d'), {
  type: 'pie',
  data: { labels, datasets: [{ data }] },
  options: {
    responsive: true,
    maintainAspectRatio: true,
    layout: { padding: 20 },
    interaction: { mode: 'nearest', intersect: true },
    plugins: {
      legend: { position: 'right' },
      tooltip: {
        enabled: true,
        position: 'nearest',
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


  // 6) Вывод итогов
  document.getElementById('total-spent').textContent =
    `Траты за период: ${totalSpent.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽`;
  document.getElementById('total-remainder').textContent =
    `Общий остаток по всем выпискам: ${TOTAL_REMAINDER.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽`;

  // 7) Отрисуем ежедневный график с учётом знака
  renderDailyChart(filtered);
}
function renderDailyChart(filtered) {
  const sumsByDate = {};

  // агрегируем только расходные операции по полю `type==="expense"`
  filtered
    .filter(tx => tx.type === 'expense')
    .forEach(tx => {
      // tx.date — ISO-строка "YYYY-MM-DD"
      const key = tx.date;
      sumsByDate[key] = (sumsByDate[key] || 0) + tx.amount;
    });

  const labels = Object.keys(sumsByDate).sort();
  const data   = labels.map(d => sumsByDate[d]);

  const ctx = document.getElementById('dailyChart').getContext('2d');
  if (dailyChartInstance) dailyChartInstance.destroy();
  dailyChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Траты в день, ₽',
        data,
        fill: true,
        tension: 0.2,
        borderWidth: 2,
        pointRadius: 3
      }]
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
      plugins: {
        legend: { position: 'top' }
      }
    }
  });
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

