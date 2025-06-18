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

$sql = "
    SELECT
      `id`,
      `ticker`,
      `purchase_date`,
      `price_per_share`,
      `quantity`,
      `op_type`
    FROM `operations`
    WHERE `user_id` = ?
    ORDER BY `purchase_date` DESC, `id` DESC
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

$stmt->bind_param('i', $userId);
$stmt->execute();
$result = $stmt->get_result();

$trades = [];
while ($row = $result->fetch_assoc()) {
    $trades[] = $row;
}

echo json_encode([
    'status' => 'success',
    'trades' => $trades
]);

$stmt->close();
$mysqli->close();
