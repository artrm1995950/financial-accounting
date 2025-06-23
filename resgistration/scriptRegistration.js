function toggleButton(formId, buttonId) {
    const inputFields = Array.from(document.querySelectorAll(`#${formId} input`))
  .filter(input => input.offsetParent !== null);

    const submitButton = document.getElementById(buttonId);
    let allFieldsFilled = true;
    let emailValid = true;

    for (let i = 0; i < inputFields.length; i++) {
        if (inputFields[i].value.trim() === "") {
            allFieldsFilled = false;
            break;
        }
    }

    const emailFields = document.querySelectorAll(`#${formId} input[type="email"]`);
    emailFields.forEach(field => {
        const errorMessage = document.getElementById(`${formId === 'login-form' ? 'login' : 'register'}-email-error`);
        
        if (field.value && field.value.indexOf('@') === -1) {
            emailValid = false;
            errorMessage.style.display = 'inline';
        } else {
            errorMessage.style.display = 'none';
        }
    });

    allFieldsFilled = allFieldsFilled && emailValid;

    submitButton.disabled = !allFieldsFilled;
}
function toggleButtonRegistration(formId, buttonId) {
    const inputFields = document.querySelectorAll(`#${formId} input`);
    const submitButton = document.getElementById(buttonId);
    let allFieldsFilled = true;
    let emailValid = true;

    for (let i = 0; i < inputFields.length; i++) {
        if (inputFields[i].value.trim() === "") {
            allFieldsFilled = false;
            break;
        }
    }

    const emailFields = document.querySelectorAll(`#${formId} input[type="email"]`);
    emailFields.forEach(field => {
        const errorMessage = document.getElementById(`${formId === 'login-form' ? 'login' : 'register'}-email-error`);
        
        if (field.value && field.value.indexOf('@') === -1) {
            emailValid = false;
            errorMessage.style.display = 'inline';
        } else {
            errorMessage.style.display = 'none';
        }
    });

    allFieldsFilled = allFieldsFilled && emailValid;

    submitButton.disabled = !allFieldsFilled;
}





function generateCode() {
    return Math.floor(100000 + Math.random() * 900000); 
}

function sendVerificationCode() {
    
    
    let verificationCode = generateCode();
    sessionStorage.setItem("verificationCode", verificationCode);

    let emailInput = document.querySelector("#register-form input[type='email']");
    let userEmail = emailInput.value.trim();
    emailjs.init("gyV5KWvrmkLRQUJtW");
    let templateParams = {
        email: userEmail,
        from_name: "Тест",
        message: verificationCode
    };

    emailjs.send("service_yo3g6rn", "template_z282eer", templateParams)
    .then(response => {
        document.getElementById("register-email").disabled = true;
        document.getElementById('email-sent-message').style.display = 'block';

    document.getElementById('verification-section').style.display = 'block';
    document.getElementById('register-btn').style.display = 'none';
        document.getElementById("email-sent-message").style.display = "block";
        document.getElementById("verification-section").style.display = "block";
        console.log("Success:", response);
        let errorMessage = document.getElementById("email-error-message");
        if (errorMessage) {
            errorMessage.style.display = "none";
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
        
        document.getElementById('register-btn').style.display = '';
        
        console.log("Error:", error);
    });



}


function verifyCode() {
    const userInputCode = document.getElementById('verification-code').value.trim();
    const savedCode = sessionStorage.getItem("verificationCode");

    if (userInputCode === savedCode) {
        alert('Вы зарегистрированы!');

        const fullName = document.getElementById('full-name').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value.trim();

        var formData = new FormData();
        formData.append('full_name', fullName);
        formData.append('email', email);
        formData.append('password', password);

        fetch('register_user.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            if (data.status === 'success') {
                alert('Регистрация прошла успешно!');
            } else {
                alert('Ошибка при регистрации! ' + data.message);
            }
        })
        .catch(error => {
            alert('Ошибка сети');
            console.log(error);
        });

        sessionStorage.removeItem("verificationCode");
    } else {
        alert('Неверный код! Попробуйте снова.');
    }
}







function SendMessages() {
    let emailInput = document.querySelector("#register-form input[type='email']");
    let userEmail = emailInput.value.trim();

    if (!userEmail) {
        alert("Пожалуйста, введите адрес электронной почты.");
        return;
    }

    let templateParams = {
        email: userEmail,
        from_name: "FinPod",
        message: "Ваш код подтверждения: 123456"
    };

    emailjs.send("service_yo3g6rn", "template_z282eer", templateParams)
        .then(response => {
            alert("Письмо успешно отправлено на " + userEmail);
            console.log("Success:", response);
            
            document.getElementById("email-sent-message").style.display = "block";
            document.getElementById("verification-section").style.display = "block";
        })
        .catch(error => {
            alert("Ошибка при отправке письма!");
            console.log("Error:", error);
        });
}
function loginUser() {
    var email = document.getElementById('login-email').value;
    var password = document.getElementById('login-password').value;

    if (!email || !password) {
        alert("Пожалуйста, заполните все поля.");
        return;
    }

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);

    fetch('login.php', {
    method: 'POST',
    body: formData,
    credentials: 'include'
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
    document.getElementById('login-btn').style.display = 'none';
    
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    if (loginEmail) loginEmail.style.display = 'none';
    if (loginPassword) loginPassword.style.display = 'none';
  
    const resetPasswordBtn = document.getElementById('reset-password-btn');
    if (resetPasswordBtn) resetPasswordBtn.style.display = 'none';
  
    let resetContainer = document.getElementById('reset-email-container');
    if (!resetContainer) {
      resetContainer = document.createElement('div');
      resetContainer.className = 'form-group';
      resetContainer.id = 'reset-email-container';
      
      const resetEmailInput = document.createElement('input');
      resetEmailInput.type = 'email';
      resetEmailInput.id = 'reset-email';
      resetEmailInput.placeholder = 'Введите адрес для сброса пароля';
      resetContainer.appendChild(resetEmailInput);
      
      const errorSpan = document.createElement('span');
      errorSpan.id = 'reset-email-error';
      errorSpan.className = 'error-message';
      resetContainer.appendChild(errorSpan);
      
      const loginForm = document.getElementById('login-form');
      loginForm.insertBefore(resetContainer, loginForm.firstChild);
    } else {
      resetContainer.style.display = 'block';
    }
  
    let sendCodeBtn = document.getElementById('send-code-btn');
    if (!sendCodeBtn) {
      sendCodeBtn = document.createElement('button');
      sendCodeBtn.id = 'send-code-btn';
      sendCodeBtn.type = 'button';
      sendCodeBtn.textContent = 'Отправить проверочный код';
      sendCodeBtn.onclick = sendVerificationCodeReserPassword;
  
      const btnFormGroup = document.createElement('div');
      btnFormGroup.className = 'form-group';
      btnFormGroup.appendChild(sendCodeBtn);
  
      const loginForm = document.getElementById('login-form');
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
  
    const verificationCode = generateCode();
    sessionStorage.setItem("resetCode", verificationCode);
    sessionStorage.setItem("resetEmail", emailVal);
  
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

        document.getElementById("send-code-btn").style.display = "none";
  
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
  
    const codeInput = document.createElement("input");
    codeInput.type = "text";
    codeInput.id = "reset-verification-code";
    codeInput.placeholder = "Введите проверочный код";
  
    const passInput = document.createElement("input");
    passInput.type = "password";
    passInput.id = "new-password";
    passInput.placeholder = "Новый пароль";
  
    const submitBtn = document.createElement("button");
    submitBtn.textContent = "Сбросить пароль";
    submitBtn.onclick = verifyResetCode;
  
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
  
    alert("Пароль успешно сброшен ");
  
    sessionStorage.removeItem("resetCode");
    sessionStorage.removeItem("resetEmail");
  
    const section = document.getElementById("verify-reset-section");
    if (section) section.remove();
  }
    