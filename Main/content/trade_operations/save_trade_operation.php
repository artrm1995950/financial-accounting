<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['status'=>'error','message'=>'Не авторизованы']);
    exit;
}

$input  = json_decode(file_get_contents('php://input'), true);
$ticker = trim($input['ticker']            ?? '');
$date   = trim($input['purchase_date']     ?? '');
$price  = trim($input['price_per_share']   ?? '');
$qty    = trim($input['quantity']          ?? '');
$type   = trim($input['op_type']           ?? '');

if ($ticker === '' || $date === '' || $price === '' || $qty === '' || !in_array($type, ['buy','sell'], true)) {
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

// Вставляем op_type
$sql = "
    INSERT INTO `operations`
      (`user_id`, `ticker`, `purchase_date`, `price_per_share`, `quantity`, `op_type`)
    VALUES (?, ?, ?, ?, ?, ?)
";
$stmt = $mysqli->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode([
        'status'=>'error',
        'message'=>"Ошибка подготовки запроса: {$mysqli->error}"
    ]);
    exit;
}

$stmt->bind_param(
    'issdis',
    $userId,
    $ticker,
    $date,
    $price,
    $qty,
    $type
);

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>'Ошибка сохранения: '.$stmt->error]);
    exit;
}

$newId = $stmt->insert_id;

echo json_encode([
    'status' => 'success',
    'trade'  => [
        'id'              => $newId,
        'ticker'          => $ticker,
        'purchase_date'   => $date,
        'price_per_share' => $price,
        'quantity'        => (int)$qty,
        'op_type'         => $type
    ]
]);

$stmt->close();
$mysqli->close();
