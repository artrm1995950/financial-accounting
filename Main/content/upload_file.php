<?php
// файл: content/upload_file.php

ini_set('display_errors', 1);
error_reporting(E_ALL);
session_start();
header('Content-Type: application/json; charset=utf-8');

// 1) Авторизация
if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['status'=>'error','message'=>'Не авторизованы']);
    exit;
}

// 2) Проверяем POST и файл
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['status'=>'error','message'=>'Файл не передан']);
    exit;
}

// 3) Подключаемся к БД
$db = new mysqli('localhost','root','password','finychet');
if ($db->connect_error) {
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>'DB connect error: '.$db->connect_error]);
    exit;
}
$db->set_charset('utf8mb4');

// 4) Собираем данные
$userId       = (int)$_SESSION['user_id'];
$bank         = $_POST['bank']           ?? 'unknown';
$date         = $_POST['statement_date'] ?? null; // будем писать в upload_date
if (empty($date)) {
    $date = date('Y-m-d');
}


$uploadDir    = 'C:\\Users\\79969\\Desktop\\FileFinance\\';
$originalName = basename($_FILES['file']['name']);
$uniqueName   = $userId . '_' . uniqid() . '_' . $originalName;
$targetPath   = $uploadDir . $uniqueName;
// 4.5) Проверка расширения и MIME-типа
$allowedExtensions = ['pdf', 'xlsx', 'xls', 'docx'];
$allowedMimeTypes  = [
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

$fileMimeType = mime_content_type($_FILES['file']['tmp_name']);
$fileExt      = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

if (!in_array($fileExt, $allowedExtensions) || !in_array($fileMimeType, $allowedMimeTypes)) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Недопустимый тип файла!'
    ]);
    exit;
}

// 5) Сохраняем файл
if (!move_uploaded_file($_FILES['file']['tmp_name'], $targetPath)) {
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>'Не удалось сохранить файл']);
    exit;
}

// 6) Записываем запись в user_files
// Только те поля, которые реально есть:
$stmt = $db->prepare(
    "INSERT INTO user_files
       (user_id, file_path, bank, upload_date)
     VALUES (?, ?, ?, ?)"
);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>'Prepare failed: '.$db->error]);
    exit;
}
$stmt->bind_param(
    "isss",
    $userId,
    $targetPath,
    $bank,
    $date  // записываем из формы в колонку upload_date
);

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>'Execute failed: '.$stmt->error]);
    exit;
}

// 7) Успех
echo json_encode([
  'status'   => 'success',
  'filePath' => $targetPath
]);

$stmt->close();
$db->close();
