<?php

session_start();
header('Content-Type: application/json; charset=utf-8');


if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Не авторизованы']);
    exit;
}


define('DB_HOST',     'localhost');
define('DB_USER',     'root');
define('DB_PASSWORD', 'password');
define('DB_NAME',     'finychet');


$mysqli = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);
if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Ошибка БД']);
    exit;
}
$mysqli->set_charset('utf8mb4');


$username     = trim($_POST['username']     ?? '');
$message_text = trim($_POST['message_text'] ?? '');
$category     = trim($_POST['category']     ?? '');


if ($username === '' || $message_text === '' || $category === '') {
    echo json_encode(['status' => 'error', 'message' => 'Все поля обязательны']);
    exit;
}


$sql = "INSERT INTO comments (username, created_at, message_text, category)
        VALUES (?, NOW(), ?, ?)";
$stmt = $mysqli->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Ошибка подготовки запроса']);
    exit;
}

$stmt->bind_param('sss',
    $username,
    $message_text,
    $category
);

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Ошибка при сохранении']);
    exit;
}

echo json_encode(['status' => 'success']);
$stmt->close();
$mysqli->close();
