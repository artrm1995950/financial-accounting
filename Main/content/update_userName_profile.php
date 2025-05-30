<?php
// update_userName_profile.php

// Отключаем вывод предупреждений и уведомлений
error_reporting(0);

// Отправляем JSON в любом случае
header('Content-Type: application/json; charset=utf-8');

// Стартуем сессию, чтобы получить user_id
session_start();
if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}
$userId = (int) $_SESSION['user_id'];

// Проверяем, что пришёл POST-параметр full_name
if (!isset($_POST['full_name']) || trim($_POST['full_name']) === '') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Не передано имя']);
    exit;
}
$fullName = trim($_POST['full_name']);

// Параметры подключения к базе
define('DB_HOST',     'localhost');
define('DB_USER',     'root');
define('DB_PASSWORD', 'password');   // Замените на ваш пароль
define('DB_NAME',     'finychet');   // Название вашей базы

// Подключаемся к MySQL через MySQLi
$mysqli = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);
if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Ошибка подключения: ' . $mysqli->connect_error
    ]);
    exit;
}

// Подготавливаем запрос на обновление
$stmt = $mysqli->prepare("UPDATE users SET full_name = ? WHERE id = ?");
if (!$stmt) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Ошибка подготовки запроса: ' . $mysqli->error
    ]);
    exit;
}

$stmt->bind_param('si', $fullName, $userId);
if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Ошибка при обновлении: ' . $stmt->error
    ]);
    exit;
}

// Успешный ответ
echo json_encode([
    'status'    => 'success',
    'message'   => 'Имя успешно обновлено',
    'full_name' => $fullName
]);

// Закрываем соединения
$stmt->close();
$mysqli->close();
exit;
