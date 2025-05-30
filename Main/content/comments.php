<?php
// comments.php
session_start();
header('Content-Type: application/json; charset=utf-8');

// проверка авторизации (если нужна)
// if (empty($_SESSION['user_id'])) {
//   http_response_code(401);
//   echo json_encode([]);
//   exit;
//}

// настройки БД (как в других скриптах)
define('DB_HOST',     'localhost');
define('DB_USER',     'root');
define('DB_PASSWORD', 'password');
define('DB_NAME',     'finychet');

$mysqli = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);
if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode([]);
    exit;
}
$mysqli->set_charset('utf8mb4');

// читаем параметр category (тикер) из GET
$category = trim($_GET['ticker'] ?? '');
if ($category === '') {
    echo json_encode([]);
    exit;
}

// готовим запрос
$sql = "SELECT username, message_text, created_at 
        FROM comments 
        WHERE category = ? 
        ORDER BY created_at DESC";
$stmt = $mysqli->prepare($sql);
$stmt->bind_param('s', $category);
$stmt->execute();
$result = $stmt->get_result();

$comments = [];
while ($row = $result->fetch_assoc()) {
    $comments[] = [
        'username'    => $row['username'],
        'text'        => $row['message_text'],
        'created_at'  => $row['created_at']
    ];
}

echo json_encode($comments, JSON_UNESCAPED_UNICODE);
$stmt->close();
$mysqli->close();
