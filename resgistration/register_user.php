<?php
// Настройки подключения к базе данных
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASSWORD', 'password'); // Используйте ваш пароль
define('DB_NAME', 'finychet'); // Название вашей базы данных

// Создаем подключение
$mysqli = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);

// Проверка подключения
if ($mysqli->connect_error) {
    die("Ошибка подключения: " . $mysqli->connect_error);
}

// Получаем данные из POST-запроса
if (isset($_POST['full_name'], $_POST['email'], $_POST['password'])) {
    $fullName = $_POST['full_name'];
    $email = $_POST['email'];
    $password = password_hash($_POST['password'], PASSWORD_DEFAULT);
    // Хешируем пароль, если вы хотите сохранить его как хеш
    // $password = password_hash($_POST['password'], PASSWORD_DEFAULT);

    // Проверка, существует ли уже пользователь с таким email
    $checkQuery = $mysqli->prepare("SELECT id FROM users WHERE email = ?");
    if ($checkQuery === false) {
        die('Ошибка подготовки запроса: ' . $mysqli->error);
    }
    $checkQuery->bind_param("s", $email);
    $checkQuery->execute();
    $checkQuery->store_result();

    if ($checkQuery->num_rows > 0) {
        echo json_encode(['status' => 'error', 'message' => 'Этот email уже зарегистрирован.']);
    } else {
        // Вставляем нового пользователя с открытым паролем (или хешированным паролем, если требуется)
        $insertQuery = $mysqli->prepare("INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)");
        if ($insertQuery === false) {
            die('Ошибка подготовки запроса: ' . $mysqli->error);
        }
        $insertQuery->bind_param("sss", $fullName, $email, $password);

        if ($insertQuery->execute()) {
            echo json_encode(['status' => 'success', 'message' => 'Данные успешно записаны']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Ошибка при регистрации: ' . $insertQuery->error]);
        }
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Не все данные были переданы.']);
}

// Закрываем соединение
$mysqli->close();
?>
