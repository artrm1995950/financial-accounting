<?php


error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
session_start();


if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['status'=>'error','message'=>'Не авторизованы']);
    exit;
}
$userId = (int)$_SESSION['user_id'];


if (!isset($_POST['about'])) {
    http_response_code(400);
    echo json_encode(['status'=>'error','message'=>'Пустой текст «О себе»']);
    exit;
}
$about = trim($_POST['about']);


define('DB_HOST','localhost');
define('DB_USER','root');
define('DB_PASSWORD','password');
define('DB_NAME','finychet');

$mysqli = new mysqli(DB_HOST,DB_USER,DB_PASSWORD,DB_NAME);
if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>'Ошибка БД: '.$mysqli->connect_error]);
    exit;
}
$mysqli->set_charset('utf8mb4');


$sql = "
  INSERT INTO `user_profiles` (user_id, about)
  VALUES (?, ?)
  ON DUPLICATE KEY UPDATE about = VALUES(about)
";
$stmt = $mysqli->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>'Ошибка подготовки: '.$mysqli->error]);
    exit;
}

$stmt->bind_param('is', $userId, $about);
if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>'Ошибка выполнения: '.$stmt->error]);
    exit;
}


echo json_encode([
  'status' => 'success',
  'message'=> 'Описание «О себе» сохранено',
  'about'  => $about
]);

$stmt->close();
$mysqli->close();
