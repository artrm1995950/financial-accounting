function toggleButton(formId, buttonId) {
    const inputFields = Array.from(document.querySelectorAll(`#${formId} input`))
  .filter(input => input.offsetParent !== null); // исключает скрытые

    const submitButton = document.getElementById(buttonId);
    let allFieldsFilled = true; // Считаем, что все поля заполнены, пока не найдем пустое
    let emailValid = true; // Флаг для проверки валидности email

    // Проверяем каждое поле
    for (let i = 0; i < inputFields.length; i++) {
        if (inputFields[i].value.trim() === "") {
            allFieldsFilled = false; // Если находим пустое поле, меняем на false
            break; // Останавливаем цикл, так как дальше проверять не нужно
        }
    }

    // Проверяем поле email на наличие символа "@"
    const emailFields = document.querySelectorAll(`#${formId} input[type="email"]`);
    emailFields.forEach(field => {
        const errorMessage = document.getElementById(`${formId === 'login-form' ? 'login' : 'register'}-email-error`);
        
        // Проверяем только поле email
        if (field.value && field.value.indexOf('@') === -1) {
            emailValid = false; // Если в email нет '@', делаем его невалидным
            errorMessage.style.display = 'inline'; // Показываем сообщение об ошибке
        } else {
            errorMessage.style.display = 'none'; // Скрываем сообщение
        }
    });

    // Если все поля заполнены и email валиден, кнопка активна
    allFieldsFilled = allFieldsFilled && emailValid;

    submitButton.disabled = !allFieldsFilled; // Отключаем кнопку, если не все поля заполнены или email невалиден
}
function toggleButtonRegistration(formId, buttonId) {
    const inputFields = document.querySelectorAll(`#${formId} input`);
    const submitButton = document.getElementById(buttonId);
    let allFieldsFilled = true; // Считаем, что все поля заполнены, пока не найдем пустое
    let emailValid = true; // Флаг для проверки валидности email

    // Проверяем каждое поле
    for (let i = 0; i < inputFields.length; i++) {
        if (inputFields[i].value.trim() === "") {
            allFieldsFilled = false; // Если находим пустое поле, меняем на false
            break; // Останавливаем цикл, так как дальше проверять не нужно
        }
    }

    // Проверяем поле email на наличие символа "@"
    const emailFields = document.querySelectorAll(`#${formId} input[type="email"]`);
    emailFields.forEach(field => {
        const errorMessage = document.getElementById(`${formId === 'login-form' ? 'login' : 'register'}-email-error`);
        
        // Проверяем только поле email
        if (field.value && field.value.indexOf('@') === -1) {
            emailValid = false; // Если в email нет '@', делаем его невалидным
            errorMessage.style.display = 'inline'; // Показываем сообщение об ошибке
        } else {
            errorMessage.style.display = 'none'; // Скрываем сообщение
        }
    });

    // Если все поля заполнены и email валиден, кнопка активна
    allFieldsFilled = allFieldsFilled && emailValid;

    submitButton.disabled = !allFieldsFilled; // Отключаем кнопку, если не все поля заполнены или email невалиден
}





function generateCode() {
    return Math.floor(100000 + Math.random() * 900000); 
}

function sendVerificationCode() {
    
    // Показываем сообщение о том, что код отправлен на почту
    
    let verificationCode = generateCode();
    sessionStorage.setItem("verificationCode", verificationCode); // Сохраняем код
    // Здесь можно добавить реальную логику отправки кода на почту
    // В реальном случае отправка письма может быть обработана сервером

    let emailInput = document.querySelector("#register-form input[type='email']"); // Получаем поле email
    let userEmail = emailInput.value.trim(); // Берём введённое значение и убираем пробелы
    emailjs.init("gyV5KWvrmkLRQUJtW");
    let templateParams = {
        email: userEmail, // Убедитесь, что поле совпадает с EmailJS-шаблоном
        from_name: "Тест",
        message: verificationCode
    };

    emailjs.send("service_yo3g6rn", "template_z282eer", templateParams)
    .then(response => {
        document.getElementById("register-email").disabled = true;
        document.getElementById('email-sent-message').style.display = 'block';

    // Показываем поле для ввода кода и меняем кнопку
    document.getElementById('verification-section').style.display = 'block';
    document.getElementById('register-btn').style.display = 'none';
        document.getElementById("email-sent-message").style.display = "block";
        document.getElementById("verification-section").style.display = "block";
        console.log("Success:", response);
        let errorMessage = document.getElementById("email-error-message");
        if (errorMessage) {
            errorMessage.style.display = "none";  // Скрываем сообщение об ошибке
        }
    })
    .catch(error => {
        let errorMessage = document.getElementById("email-error-message");
        if (!errorMessage) {
            errorMessage = document.createElement("p");
            document.getElementById("register-email").disabled = false;
            errorMessage.id = "email-error-message";
            errorMessage.style.color = "red";
            errorMessage.style.marginTop = "10px";
            errorMessage.textContent = "Ошибка при отправке письма. Попробуйте еще раз.";
            document.getElementById("email-sent-message").parentElement.appendChild(errorMessage);
        } else {
            errorMessage.style.display = "block";
        }

        document.getElementById("email-sent-message").style.display = "none";
        document.getElementById("verification-section").style.display = "none";
        
        // Разблокировать кнопку Register
        document.getElementById('register-btn').style.display = '';
        
        console.log("Error:", error);
    });



}


function verifyCode() {
    const userInputCode = document.getElementById('verification-code').value.trim();  // Получаем введённый код
    const savedCode = sessionStorage.getItem("verificationCode");  // Получаем сохранённый код

    if (userInputCode === savedCode) {
        alert('Вы зарегистрированы!');

        // Получаем данные напрямую с полей формы
        const fullName = document.getElementById('full-name').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value.trim();

        // Создаем объект FormData
        var formData = new FormData();
        formData.append('full_name', fullName);
        formData.append('email', email);
        formData.append('password', password);

        // Отправляем данные на сервер для регистрации
        fetch('register_user.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log(data); // Выводим данные ответа в консоль
            if (data.status === 'success') {
                alert('Регистрация прошла успешно!');
            } else {
                alert('Ошибка при регистрации! ' + data.message);
            }
        })
        .catch(error => {
            alert('Ошибка сети');
            console.log(error); // Выводим ошибку в консоль
        });

        // Удаляем данные после регистрации
        sessionStorage.removeItem("verificationCode");
    } else {
        alert('Неверный код! Попробуйте снова.');
    }
}







function SendMessages() {
    let emailInput = document.querySelector("#register-form input[type='email']"); // Получаем поле email
    let userEmail = emailInput.value.trim(); // Берём введённое значение и убираем пробелы

    if (!userEmail) {
        alert("Пожалуйста, введите адрес электронной почты.");
        return;
    }

    let templateParams = {
        email: userEmail, // Используем email, введённый пользователем
        from_name: "FinPod",
        message: "Ваш код подтверждения: 123456" // Здесь можно генерировать случайный код
    };

    emailjs.send("service_yo3g6rn", "template_z282eer", templateParams)
        .then(response => {
            alert("Письмо успешно отправлено на " + userEmail);
            console.log("Success:", response);
            
            // Показываем сообщение и поле для ввода кода
            document.getElementById("email-sent-message").style.display = "block";
            document.getElementById("verification-section").style.display = "block";
        })
        .catch(error => {
            alert("Ошибка при отправке письма!");
            console.log("Error:", error);
        });
}
function loginUser() {
    // Получаем значения полей
    var email = document.getElementById('login-email').value;
    var password = document.getElementById('login-password').value;

    // Проверяем, чтобы поля не были пустыми
    if (!email || !password) {
        alert("Пожалуйста, заполните все поля.");
        return;
    }

    // Формируем данные для отправки
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);

    fetch('login.php', {
    method: 'POST',
    body: formData,
    credentials: 'include'           // ← обязательно!
    })
    .then(res => res.text())
    .then(data => {
    alert(data);
    if (data.includes('Авторизация успешна')) {
        window.location.href = '/Main/Menu.html';
    }
    })
    .catch(err => console.error(err));

}

  
 
function showResetPassword() {
    // Скрываем кнопку "Войти"
    document.getElementById('login-btn').style.display = 'none';
    
    // Скрываем поля "Адрес электронной почты" и "Пароль"
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    if (loginEmail) loginEmail.style.display = 'none';
    if (loginPassword) loginPassword.style.display = 'none';
  
    // Скрываем кнопку "Сбросить пароль"
    const resetPasswordBtn = document.getElementById('reset-password-btn');
    if (resetPasswordBtn) resetPasswordBtn.style.display = 'none';
  
    // Проверяем, существует ли уже контейнер для ввода email для сброса пароля
    let resetContainer = document.getElementById('reset-email-container');
    if (!resetContainer) {
      // Создаем контейнер
      resetContainer = document.createElement('div');
      resetContainer.className = 'form-group';
      resetContainer.id = 'reset-email-container';
      
      // Создаем поле ввода email
      const resetEmailInput = document.createElement('input');
      resetEmailInput.type = 'email';
      resetEmailInput.id = 'reset-email';
      resetEmailInput.placeholder = 'Введите адрес для сброса пароля';
      resetContainer.appendChild(resetEmailInput);
      
      // Создаем элемент для вывода ошибки
      const errorSpan = document.createElement('span');
      errorSpan.id = 'reset-email-error';
      errorSpan.className = 'error-message';
      resetContainer.appendChild(errorSpan);
      
      // Вставляем контейнер в начало формы
      const loginForm = document.getElementById('login-form');
      loginForm.insertBefore(resetContainer, loginForm.firstChild);
    } else {
      resetContainer.style.display = 'block';
    }
  
    // Проверяем, существует ли уже кнопка "Отправить проверочный код"
    let sendCodeBtn = document.getElementById('send-code-btn');
    if (!sendCodeBtn) {
      // Создаем кнопку "Отправить проверочный код"
      sendCodeBtn = document.createElement('button');
      sendCodeBtn.id = 'send-code-btn';
      sendCodeBtn.type = 'button';
      sendCodeBtn.textContent = 'Отправить проверочный код';
      sendCodeBtn.onclick = sendVerificationCodeReserPassword; // используем функцию отправки кода
  
      const btnFormGroup = document.createElement('div');
      btnFormGroup.className = 'form-group';
      btnFormGroup.appendChild(sendCodeBtn);
  
      const loginForm = document.getElementById('login-form');
      // Добавляем кнопку в конец формы
      loginForm.appendChild(btnFormGroup);
    } else {
      sendCodeBtn.style.display = 'block';
    }
  }
  
  function sendVerificationCodeReserPassword() {
    const resetEmailElem = document.getElementById('reset-email');
    const errorSpan = document.getElementById('reset-email-error');
    const resetContainer = document.getElementById('reset-email-container');
    if (resetContainer) resetContainer.style.display = 'block';
  
    errorSpan.textContent = "";
    errorSpan.style.display = "none";
  
    if (!resetEmailElem) {
      alert("Поле сброса пароля не найдено.");
      return;
    }
  
    const emailVal = resetEmailElem.value.trim();
  
    if (emailVal === "") {
      errorSpan.textContent = "Пожалуйста, заполните поле.";
      errorSpan.style.display = "inline";
      return;
    }
  
    if (emailVal.indexOf('@') === -1) {
      errorSpan.textContent = "Email должен содержать символ \"@\".";
      errorSpan.style.display = "inline";
      return;
    }
  
    // ✅ Генерация проверочного кода
    const verificationCode = generateCode();
    sessionStorage.setItem("resetCode", verificationCode);
    sessionStorage.setItem("resetEmail", emailVal);
  
    // ✅ Отправка через EmailJS
    emailjs.init("gyV5KWvrmkLRQUJtW");
    const templateParams = {
      email: emailVal,
      from_name: "Сброс пароля",
      message: verificationCode
    };
  
    emailjs.send("service_yo3g6rn", "template_z282eer", templateParams)
      .then(response => {
        alert("Код отправлен на " + emailVal);
        resetEmailElem.style.display = "none";

        // ⛔ скрываем кнопку
        document.getElementById("send-code-btn").style.display = "none";
  
        // 🟢 создаем поля для кода и пароля
        createResetPasswordFields(resetContainer);
      })
      .catch(error => {
        console.error("Ошибка отправки:", error);
        alert("Не удалось отправить код.");
      });
  }
  function createResetPasswordFields(container) {
    const section = document.createElement("div");
    section.id = "verify-reset-section";
    section.style.display = "flex";
    section.style.flexDirection = "column";
    section.style.alignItems = "center";
    section.style.gap = "10px";
    section.style.marginTop = "20px";
  
    // Поле для кода
    const codeInput = document.createElement("input");
    codeInput.type = "text";
    codeInput.id = "reset-verification-code";
    codeInput.placeholder = "Введите проверочный код";
  
    // Поле для нового пароля
    const passInput = document.createElement("input");
    passInput.type = "password";
    passInput.id = "new-password";
    passInput.placeholder = "Новый пароль";
  
    // Кнопка "Сбросить пароль"
    const submitBtn = document.createElement("button");
    submitBtn.textContent = "Сбросить пароль";
    submitBtn.onclick = verifyResetCode;
  
    // Стили
    [codeInput, passInput, submitBtn].forEach(el => {
      el.style.width = "300px";
      el.style.padding = "10px";
      el.style.borderRadius = "5px";
      el.style.fontSize = "16px";
    });
    submitBtn.style.backgroundColor = "black";
    submitBtn.style.color = "white";
    submitBtn.style.border = "none";
    submitBtn.style.cursor = "pointer";
  
    // Добавление в форму
    section.appendChild(codeInput);
    section.appendChild(passInput);
    section.appendChild(submitBtn);
    container.appendChild(section);
  }
  function verifyResetCode() {
    const code = document.getElementById("reset-verification-code").value.trim();
    const newPassword = document.getElementById("new-password").value.trim();
    const savedCode = sessionStorage.getItem("resetCode");
    const savedEmail = sessionStorage.getItem("resetEmail");
  
    if (!code || !newPassword) {
      alert("Пожалуйста, заполните все поля.");
      return;
    }
  
    if (code !== savedCode) {
      alert("Неверный проверочный код.");
      return;
    }
  
    // ✅ Здесь можно отправить запрос на сервер
    alert("Пароль успешно сброшен ");
  
    // Очистка
    sessionStorage.removeItem("resetCode");
    sessionStorage.removeItem("resetEmail");
  
    // Удаление секции
    const section = document.getElementById("verify-reset-section");
    if (section) section.remove();
  }
    