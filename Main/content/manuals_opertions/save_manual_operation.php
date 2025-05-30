<?php
// save_manual_operation.php
session_start();
header('Content-Type: application/json; charset=utf-8');

// проверка авторизации
if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['status'=>'error','message'=>'Не авторизованы']);
    exit;
}

// получаем JSON из тела
$input = json_decode(file_get_contents('php://input'), true);
$date     = trim($input['date']     ?? '');
$category = trim($input['category'] ?? '');
$amount   = trim($input['amount']   ?? '');
$type     = trim($input['type']     ?? '');

// если дата не указана — ставим сегодня
if ($date === '') {
    $date = date('Y-m-d');
}

if ($category === '' || $amount === '' || !in_array($type, ['expense','income'], true)) {
    echo json_encode(['status'=>'error','message'=>'Некорректные данные']);
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

// вставка
$sql = "INSERT INTO manual_operations 
          (user_id, op_date, category, amount, type, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())";
$stmt = $mysqli->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>'Ошибка подготовки запроса']);
    exit;
}

$stmt->bind_param(
    'issds',
    $userId,
    $date,
    $category,
    $amount,
    $type
);

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>'Ошибка сохранения']);
    exit;
}

$newId = $stmt->insert_id;

echo json_encode([
    'status'    => 'success',
    'operation' => [
        'id'       => $newId,
        'date'     => $date,
        'category' => $category,
        'amount'   => $amount,
        'type'     => $type
    ]
]);

$stmt->close();
$mysqli->close();
