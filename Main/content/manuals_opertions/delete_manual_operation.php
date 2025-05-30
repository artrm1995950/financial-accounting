<?php
// delete_manual_operation.php
session_start();
header('Content-Type: application/json; charset=utf-8');

// проверка авторизации
if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['status'=>'error','message'=>'Не авторизованы']);
    exit;
}

// читаем JSON
$input = json_decode(file_get_contents('php://input'), true);
$id = isset($input['id']) ? (int)$input['id'] : 0;
if ($id <= 0) {
    echo json_encode(['status'=>'error','message'=>'Неверный ID']);
    exit;
}

define('DB_HOST',     'localhost');
define('DB_USER',     'root');
define('DB_PASSWORD', 'password');
define('DB_NAME',     'finychet');

$mysqli = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);
if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>'Ошибка подключения к БД']);
    exit;
}
$mysqli->set_charset('utf8mb4');

$userId = (int)$_SESSION['user_id'];

$sql = "DELETE FROM manual_operations WHERE id = ? AND user_id = ?";
$stmt = $mysqli->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>'Ошибка подготовки запроса']);
    exit;
}

$stmt->bind_param('ii', $id, $userId);
if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>'Ошибка удаления']);
    exit;
}

echo json_encode(['status'=>'success']);
$stmt->close();
$mysqli->close();
