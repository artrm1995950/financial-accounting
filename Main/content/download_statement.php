<?php
// файл: content/download_statement.php

session_start();
header('Content-Type: application/octet-stream; charset=utf-8');

// 1) Авторизация
if (empty($_SESSION['user_id'])) {
    http_response_code(403);
    exit('Forbidden');
}

// 2) Проверяем GET-параметр id
if (!isset($_GET['id'])) {
    http_response_code(400);
    exit('Bad Request');
}
$id = (int)$_GET['id'];
if ($id <= 0) {
    http_response_code(400);
    exit('Bad Request');
}

// 3) Подключаемся к БД
$db = new mysqli('localhost','root','password','finychet');
if ($db->connect_error) {
    http_response_code(500);
    exit('DB Connection Error');
}
$db->set_charset('utf8mb4');

// 4) Получаем путь к файлу и оригинальное имя
$stmt = $db->prepare("
    SELECT file_path
      FROM user_files
     WHERE id = ? AND user_id = ?
");
$stmt->bind_param('ii', $id, $_SESSION['user_id']);
$stmt->execute();
$stmt->bind_result($path);
if (!$stmt->fetch()) {
    http_response_code(404);
    exit('Not Found');
}
$stmt->close();
$db->close();

if (!file_exists($path)) {
    http_response_code(404);
    exit('Not Found');
}

// 5) Подготовка имени для скачивания
$filename = basename($path);

// 6) Отдаём заголовки для «скачать как…»
header('Content-Description: File Transfer');
header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Expires: 0');
header('Cache-Control: must-revalidate');
header('Pragma: public');
header('Content-Length: ' . filesize($path));

// 7) Выдаём файл
readfile($path);
exit;
