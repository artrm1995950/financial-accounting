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
  const singleLineText = text
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/\s+/g, ' ');

  const regex = /\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}\s+(\d{2}\/\d{2}\/\d{2}).+?[+-]?[\d\s,\.]+\s+[A-Z]{3}\s+[+-]?[\d\s,\.]+\s+[A-Z]{3}\s+([+-]?[\d\s,\.]+)/g;
  
  let match;
  while ((match = regex.exec(singleLineText)) !== null) {
    const date = match[1];
    const rawAmount = match[2].trim();
    
    const type = rawAmount[0] === '-' ? '-' : '+';
    const amount = Math.abs(parseFloat(rawAmount.replace(/\s/g, '').replace(',', '.')));
    
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
  const singleLineText = text.replace(/\n/g, ' ')
                             .replace(/\r/g, ' ')
                             .replace(/\s+/g, ' ');
  const remainderRegex = /Остаток\s+на\s+конец\s+периода\s*:\s*([\d\s,\.]+)/i;
  const remMatch = singleLineText.match(remainderRegex);
  
  if (remMatch) {
    return parseFloat(remMatch[1].replace(/\s/g, '').replace(',', '.'));
  } else {
    return null;
  }
}

function extractAkBarsTransactionsWithRemainder(text) {
  const transactions = simplifyAkBarsTransactions(text);
  const remainderValue = extractAkBarsRemainder(text);
  
  return {
    transactions: transactions,
    remainderDate: null,
    remainderValue: remainderValue
  };
}





  
  
  

  

function extractOzonTransactions(text) {
  const transactions = [];
  const singleLineText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  
  const regex = /(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2}:\d{2})\s+(\d+)\s+(.*?)\s+([+-])\s*([\d\s,.]+)(?=\s+(?:\d{2}\.\d{2}\.\d{4}|Итого|$))/g;
  
  let match;
  while ((match = regex.exec(singleLineText)) !== null) {
    const date = match[1];
    const description = match[4].trim();
    const type = match[5];
    let rawAmount = match[6].replace(/\s/g, '').replace(',', '.');
    const amount = Math.abs(parseFloat(rawAmount));
    
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

function extractOzonTransactionsWithRemainder(text) {
  const transactions = extractOzonTransactions(text);
  
  const singleLineText = text.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ');
  
  let remainderDate = null;
  const periodRegex = /Период выписки:\s*\d{2}\.\d{2}\.\d{4}\s*[–-]\s*(\d{2}\.\d{2}\.\d{4})/i;
  const periodMatch = singleLineText.match(periodRegex);
  if (periodMatch) {
    remainderDate = periodMatch[1];
  }
  
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
  const singleLineText = text.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ');
  
  const regex = /(\d{2}\.\d{2}\.\d{4})\s+\d{2}:\d{2}\s+(\d{2}\.\d{2}\.\d{4})\s+\d{2}:\d{2}\s+([+-]?[\d\s,\.]+\d)\s+₽\s+[+-]?[\d\s,\.]+\d\s+₽\s+(.+?)(?=\s+\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}|$)/g;
  
  let match;
  while ((match = regex.exec(singleLineText)) !== null) {
    const date = match[2];
    const rawAmount = match[3].trim();
    const type = rawAmount[0] === '-' ? '-' : '+';
    const amount = Math.abs(parseFloat(rawAmount.replace(/\s/g, '').replace(',', '.')));
    
    const description = match[4].trim();
    
    let category = "Прочие операции";
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
  const singleLineText = text.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ');
  
  const txRegex = /(\d{2}\.\d{2}\.\d{4})\s+\d{2}:\d{2}\s+\d+\s+([А-Яа-я\s]+)\s+([+-]?[\d]{1,3}(?:[\s,]\d{3})*(?:,\d{2})?)/g;
  
  let match;
  while ((match = txRegex.exec(singleLineText)) !== null) {
    const date = match[1];
    const category = match[2].trim();
    const rawAmount = match[3].trim();
    
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
  const transactions = extractSberTransactions(text);
  
  let remainderDate = null;
  let remainderValue = null;
  
  const singleLineText = text.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ');
  
  const remainderRegex = /ОСТАТОК НА\s+(\d{2}\.\d{2}\.\d{4})\s+((?:\d{1,3}(?:[\s,]\d{3})*(?:,\d{2})?\s*)+)/i;
  const remMatch = singleLineText.match(remainderRegex);
  
  if (remMatch) {
    remainderDate = remMatch[1];
    const numbers = remMatch[2].match(/\d{1,3}(?:[\s,]\d{3})*(?:,\d{2})?/g);
    if (numbers && numbers.length > 0) {
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
  const singleLineText = text.replace(/[\n\r]/g, ' ').replace(/[\s\u00A0]+/g, ' ');

  const regex = /(.+?)\s+(\d{2}\.\d{2}\.\d{4})\s+в\s+(\d{2}:\d{2})\s+(\d{2}\.\d{2}\.\d{4})\s+([\+\-\u2013\u2014])\s*([\d\s,\.]+)\s*₽/gi;
  
  let match;
  while ((match = regex.exec(singleLineText)) !== null) {
    const descriptionText = match[1].trim();
    const transactionDate = match[4];
    let type = match[5];
    if (type === '–' || type === '—') { 
      type = '-';
    }
    const amount = Math.abs(parseFloat(match[6].replace(/[\s\u00A0]/g, '').replace(',', '.')));
    
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
  const singleLineText = text.replace(/\n/g, ' ')
                             .replace(/\r/g, ' ')
                             .replace(/[\s\u00A0]+/g, ' ');
  
  let remainderDate = null;
  let remainderValue = null;
  
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
  const keyword = "В рамках Договора открыт счёт";
  const idx = text.indexOf(keyword);
  
  if (idx === -1) {
    return {
      transactions: [],
      remainderDate: null,
      remainderValue: null
    };
  }
  
  const relevantText = text.substring(idx);
  
  const transactions = extractYandexTransactions(relevantText);
  const remainder = extractYandexRemainder(relevantText);
  
  return {
    transactions: transactions,
    remainderDate: remainder.remainderDate,
    remainderValue: remainder.remainderValue
  };
}

function combineFiles() {
  const sberList = (window.sberTransactions && window.sberTransactions.transactions) || [];
  const tinkoffList = window.tinkoffTransactions || [];
  const ozonList = (window.ozonTransactions && window.ozonTransactions.transactions) || [];
  const akbarsList = (window.akbarsTransactions && window.akbarsTransactions.transactions) || [];
  const yandexList = (window.yandexTransactions && window.yandexTransactions.transactions) || [];
  
  let combined = sberList.concat(tinkoffList, ozonList, akbarsList, yandexList);
  
  combined = combined.filter(item => item.дата);
  
  combined.sort((a, b) => {
    const parseDate = (dateStr) => {
      if (!dateStr) return new Date(0);
      const [day, month, year] = dateStr.split('.').map(Number);
      return new Date(year, month - 1, day);
    };
    return parseDate(a.дата) - parseDate(b.дата);
  });
  
  const output = document.getElementById("combinedOutput");
  if (output) {
    output.innerHTML = "<h3>Объединённые транзакции:</h3>";
    output.innerHTML += `<pre>${JSON.stringify(combined, null, 2)}</pre>`;
  } else {
    console.log("Элемент для вывода объединённых транзакций не найден.");
  }
  
  console.log("Combined transactions:", combined);
const categoryTotals = {};
combined.forEach(tx => {
  const category = tx.категория || "Без категории";
  const amount = parseFloat(tx.сумма || 0);
  if (!isNaN(amount)) {
    categoryTotals[category] = (categoryTotals[category] || 0) + amount;
  }
});

const labels = Object.keys(categoryTotals);
const data = Object.values(categoryTotals);

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






