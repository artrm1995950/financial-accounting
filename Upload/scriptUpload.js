function updateStatus(input, statusId, buttonId) {
    const statusElement = document.getElementById(statusId);
    const button = document.getElementById(buttonId);

    if (input.files.length > 0) {
        statusElement.textContent = "Загружено";
        statusElement.classList.add("success");
        button.removeAttribute("disabled");
    } else {
        statusElement.textContent = "Файл не загружен";
        statusElement.classList.remove("success");
        button.setAttribute("disabled", "true");
    }
}

function readPdf(inputId, outputId) {
  const fileInput = document.getElementById(inputId);
  const file = fileInput.files[0];

  if (!file) {
    alert("Файл не выбран!");
    return;
  }

  // Определяем название банка по идентификатору input
  let bank = "";
  if (inputId === 'sberInput') {
    bank = "Сбер";
  } else if (inputId === 'tinkoffInput') {
    bank = "Тинькофф";
  } else if (inputId === 'ozonInput') {
    bank = "Озон Банк";
  } else if (inputId === 'yandexInput') {
    bank = "Яндекс Банк";
  } else if (inputId === 'akbarsInput') {
    bank = "Ак Барс Банк";
  }

  // Отправляем файл и название банка на сервер для сохранения
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bank", bank);

  fetch("upload.php", {
    method: "POST",
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    if (data.status === "success") {
      console.log("Файл сохранён на сервере по пути:", data.filePath);
    } else {
      console.error("Ошибка сохранения файла:", data.message);
    }
  })
  .catch(error => console.error("Ошибка при отправке файла:", error));

  // Продолжаем обработку PDF для извлечения текста
  const reader = new FileReader();
  reader.onload = function () {
    const typedarray = new Uint8Array(reader.result);
    pdfjsLib.getDocument(typedarray).promise.then(pdf => {
      let promises = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        promises.push(pdf.getPage(i).then(page => {
          return page.getTextContent().then(text => {
            return text.items.map(item => item.str).join(" ");
          });
        }));
      }
      Promise.all(promises).then(pages => {
        const textContent = pages.join("\n");

        let result;
        // Выбираем функцию для обработки по банку
        if (inputId === 'sberInput') {
          result = extractSberTransactionsWithRemainder(textContent);
          window.sberTransactions = result;
        } else if (inputId === 'tinkoffInput') {
          result = extractTbankTransactions(textContent);
          window.tinkoffTransactions = result;
        } else if (inputId === 'ozonInput') {
          result = extractOzonTransactionsWithRemainder(textContent);
          window.ozonTransactions = result;
        } else if (inputId === 'yandexInput') {
          result = extractYandexTransactionsWithRemainder(textContent);
          window.yandexTransactions = result;
        } else if (inputId === 'akbarsInput') {
          result = extractAkBarsTransactionsWithRemainder(textContent);
          window.akbarsTransactions = result;
        }
        displayTransactions(result, outputId);
      });
    });
  };
  reader.readAsArrayBuffer(file);
}


function simplifyAkBarsTransactions(text) {
  const transactions = [];
  // Приводим весь текст к одной строке (удаляем переводы строк и лишние пробелы)
  const singleLineText = text
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/\s+/g, ' ');

  // Пример регулярного выражения для строк операций:
  // Сначала идёт дата и время операции, затем дата расчёта, затем произвольный текст до суммы,
  // затем, через пробелы и валюту, идёт итоговая сумма (в валюте карты) с знаком.
  const regex = /\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}\s+(\d{2}\/\d{2}\/\d{2}).+?[+-]?[\d\s,\.]+\s+[A-Z]{3}\s+[+-]?[\d\s,\.]+\s+[A-Z]{3}\s+([+-]?[\d\s,\.]+)/g;
  
  let match;
  while ((match = regex.exec(singleLineText)) !== null) {
    const date = match[1];
    const rawAmount = match[2].trim();
    
    // Если сумма начинается с "-", записываем тип "-", иначе "+"
    const type = rawAmount[0] === '-' ? '-' : '+';
    // Преобразуем сумму: убираем пробелы, заменяем запятую на точку, и берем абсолютное значение
    const amount = Math.abs(parseFloat(rawAmount.replace(/\s/g, '').replace(',', '.')));
    
    // Здесь можно добавить логику для определения категории по описанию, пока фиксировано:
    const category = "Прочие расходы";
    
    transactions.push({
      дата: date,
      сумма: amount,
      тип: type,
      категория: category
    });
  }
  
  return transactions;
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
    const date = match[1];
    const description = match[4].trim();
    const type = match[5]; // сохраняем знак: "+" или "-"
    // Преобразуем сумму: убираем пробелы, заменяем запятую на точку и берем абсолютное значение
    let rawAmount = match[6].replace(/\s/g, '').replace(',', '.');
    const amount = Math.abs(parseFloat(rawAmount));
    
    // Определяем категорию по описанию:
    let category = description;
    if (/перевод/i.test(description) || /зачисление средств/i.test(description)) {
      category = "Перевод с карты";
    } else if (/оплата товаров\/услуг/i.test(description)) {
      category = "оплата товаров озон";
    }
    
    transactions.push({
      дата: date,
      категория: category,
      сумма: amount,
      тип: type
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
    let category = "Прочие операции";
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

  /* 
    Регулярное выражение для строки операции:
    [Группа 1] - описание операции (все символы до появления формата даты)
    [Группа 2] - дата операции (формат DD.MM.YYYY) — поле, после которого идёт слово "в"
    [Группа 3] - время операции (HH:MM) (не используем)
    [Группа 4] - дата обработки (формат DD.MM.YYYY) — используем как дату транзакции
    [Группа 5] - знак суммы (может быть "+", "-", en-dash или em-dash)
    [Группа 6] - сумма операции (число с пробелами, запятой)
    
    Пример строки:
    "Входящий перевод СБП, Максим Дмитриевич С., +7 996 952-34-10, Альфа Банк 08.04.2025 в 17:45 08.04.2025 +2 000,00 ₽ +2 000,00 ₽"
  */
  const regex = /(.+?)\s+(\d{2}\.\d{2}\.\d{4})\s+в\s+(\d{2}:\d{2})\s+(\d{2}\.\d{2}\.\d{4})\s+([\+\-\u2013\u2014])\s*([\d\s,\.]+)\s*₽/gi;
  
  let match;
  while ((match = regex.exec(singleLineText)) !== null) {
    const descriptionText = match[1].trim();
    const transactionDate = match[4]; // используем дату обработки как дату транзакции
    let type = match[5]; // знак операции
    if (type === '–' || type === '—') { 
      type = '-';
    }
    // Преобразуем сумму: удаляем все пробелы и неразрывные пробелы, меняем запятую на точку, берем абсолютное значение
    const amount = Math.abs(parseFloat(match[6].replace(/[\s\u00A0]/g, '').replace(',', '.')));
    
    // Определяем категорию по описанию
    // Приводим описание к верхнему регистру для унификации поиска
    const descUpper = descriptionText.toUpperCase();
    let category;
    if (descUpper.includes("PYATEROCHKA") || descUpper.includes("ПЯТЕРОЧКА") || descUpper.includes("MAGAZIN") || descUpper.includes("PRODUCT")|| descUpper.includes("MAGNIT") || descUpper.includes("МАГАЗИН"))  {
      category = "Супермаркет";
    } else if (descUpper.includes("ВХОДЯЩИЙ ПЕРЕВОД")) {
      category = "Перевод с карты";
    } else {
      category = "Прочие операции";
    }
    
    transactions.push({
      дата: transactionDate,
      сумма: amount,
      тип: type,
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

function combineFiles() {
  // Для банков, где функция возвращает объект с полем transactions,
  // берем именно это поле.
  const sberList = (window.sberTransactions && window.sberTransactions.transactions) || [];
  // Функция extractTbankTransactions возвращает массив напрямую, так что ничего менять не нужно:
  const tinkoffList = window.tinkoffTransactions || [];
  const ozonList = (window.ozonTransactions && window.ozonTransactions.transactions) || [];
  const akbarsList = (window.akbarsTransactions && window.akbarsTransactions.transactions) || [];
  const yandexList = (window.yandexTransactions && window.yandexTransactions.transactions) || [];
  
  // Объединяем массивы транзакций
  let combined = sberList.concat(tinkoffList, ozonList, akbarsList, yandexList);
  
  // Фильтруем элементы, у которых свойство "дата" определено
  combined = combined.filter(item => item.дата);
  
  // Сортируем по дате, предполагая формат "DD.MM.YYYY"
  combined.sort((a, b) => {
    const parseDate = (dateStr) => {
      if (!dateStr) return new Date(0);
      const [day, month, year] = dateStr.split('.').map(Number);
      return new Date(year, month - 1, day);
    };
    return parseDate(a.дата) - parseDate(b.дата);
  });
  
  // Вывод объединённого списка транзакций на странице
  const output = document.getElementById("combinedOutput");
  if (output) {
    output.innerHTML = "<h3>Объединённые транзакции:</h3>";
    output.innerHTML += `<pre>${JSON.stringify(combined, null, 2)}</pre>`;
  } else {
    console.log("Элемент для вывода объединённых транзакций не найден.");
  }
  
  console.log("Combined transactions:", combined);
  // Группировка по категориям
const categoryTotals = {};
combined.forEach(tx => {
  const category = tx.категория || "Без категории";
  const amount = parseFloat(tx.сумма || 0);
  if (!isNaN(amount)) {
    categoryTotals[category] = (categoryTotals[category] || 0) + amount;
  }
});

// Подготовка данных для графика
const labels = Object.keys(categoryTotals);
const data = Object.values(categoryTotals);

// Рисуем круговую диаграмму
const ctx = document.getElementById('categoryChart').getContext('2d');
new Chart(ctx, {
  type: 'pie',
  data: {
    labels: labels,
    datasets: [{
      label: 'Суммы по категориям',
      data: data,
      borderWidth: 1
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
      },
      title: {
        display: true,
        text: 'Расходы по категориям'
      }
    }
  }
});

}






