<?php
// файл: content/get_statements_fullpath.php

session_start();
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
error_reporting(0);

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Не авторизованы']);
    exit;
}

$db = new mysqli('localhost', 'root', 'password', 'finychet');
if ($db->connect_error) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'DB connect error']);
    exit;
}
$db->set_charset('utf8mb4');

$userId = (int) $_SESSION['user_id'];
$stmt = $db->prepare("
    SELECT id, file_path, bank, upload_date
      FROM user_files
     WHERE user_id = ?
     ORDER BY upload_date DESC
");
$stmt->bind_param('i', $userId);
$stmt->execute();
$res = $stmt->get_result();

$list = [];
while ($row = $res->fetch_assoc()) {
    $list[] = [
        'id'          => (int)   $row['id'],
        'filePath'    =>         $row['file_path'],
        'bank'        =>         $row['bank'],
        'upload_date' =>         $row['upload_date'],
    ];
}

echo json_encode([
    'status'     => 'success',
    'statements' => $list,
]);

$stmt->close();
$db->close();
