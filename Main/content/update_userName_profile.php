<?php



error_reporting(0);


header('Content-Type: application/json; charset=utf-8');


session_start();
if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}
$userId = (int) $_SESSION['user_id'];


if (!isset($_POST['full_name']) || trim($_POST['full_name']) === '') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Не передано имя']);
    exit;
}
$fullName = trim($_POST['full_name']);


define('DB_HOST',     'localhost');
define('DB_USER',     'root');
define('DB_PASSWORD', 'password');   
define('DB_NAME',     'finychet');   


$mysqli = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);
if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Ошибка подключения: ' . $mysqli->connect_error
    ]);
    exit;
}


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


echo json_encode([
    'status'    => 'success',
    'message'   => 'Имя успешно обновлено',
    'full_name' => $fullName
]);


$stmt->close();
$mysqli->close();
exit;
