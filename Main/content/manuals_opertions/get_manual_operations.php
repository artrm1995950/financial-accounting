<?php

session_start();
header('Content-Type: application/json; charset=utf-8');


if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['status'=>'error','message'=>'Не авторизованы']);
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

$sql = "SELECT 
          id,
          op_date  AS date,
          category,
          amount,
          type
        FROM manual_operations
        WHERE user_id = ?
        ORDER BY op_date DESC, id DESC";
$stmt = $mysqli->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>'Ошибка подготовки запроса']);
    exit;
}

$stmt->bind_param('i', $userId);
$stmt->execute();
$result = $stmt->get_result();

$operations = [];
while ($row = $result->fetch_assoc()) {
    $operations[] = $row;
}

echo json_encode([
    'status'     => 'success',
    'operations' => $operations
]);

$stmt->close();
$mysqli->close();
