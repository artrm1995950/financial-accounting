<?php

session_start();
header('Content-Type: application/json; charset=utf-8');


if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['status'=>'error','message'=>'Не авторизованы']);
    exit;
}
$userId = (int)$_SESSION['user_id'];


define('DB_HOST','localhost');
define('DB_USER','root');
define('DB_PASSWORD','password');
define('DB_NAME','finychet');

$mysqli = new mysqli(DB_HOST,DB_USER,DB_PASSWORD,DB_NAME);
if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>'Ошибка БД']);
    exit;
}
$mysqli->set_charset('utf8mb4');


$sql = <<<SQL
SELECT 
    u.full_name,
    u.email,
    up.social_link,
    up.nickname,
    up.birth_date,
    up.about
FROM users AS u
LEFT JOIN user_profiles AS up
  ON up.user_id = u.id
WHERE u.id = ?
SQL;

$stmt = $mysqli->prepare($sql);
$stmt->bind_param('i', $userId);
$stmt->execute();
$result = $stmt->get_result();

if (!$row = $result->fetch_assoc()) {
    
    $row = [
      'full_name'   => '',
      'email'       => '',
      'social_link' => '',
      'nickname'    => '',
      'birth_date'  => '',
      'about'       => '',
    ];
}

echo json_encode($row, JSON_UNESCAPED_UNICODE);
$stmt->close();
$mysqli->close();
