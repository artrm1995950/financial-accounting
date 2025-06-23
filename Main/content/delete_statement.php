<?php


session_start();
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
error_reporting(0);


if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Не авторизованы']);
    exit;
}


if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_POST['id'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Неверный запрос']);
    exit;
}

$id = (int) $_POST['id'];
if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Неверный ID']);
    exit;
}


$db = new mysqli('localhost', 'root', 'password', 'finychet');
if ($db->connect_error) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Ошибка подключения к БД']);
    exit;
}
$db->set_charset('utf8mb4');


$stmt = $db->prepare("SELECT file_path FROM user_files WHERE id = ? AND user_id = ?");
$stmt->bind_param('ii', $id, $_SESSION['user_id']);
$stmt->execute();
$stmt->bind_result($filePath);
if (!$stmt->fetch()) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Выписка не найдена']);
    $stmt->close();
    $db->close();
    exit;
}
$stmt->close();


$stmt = $db->prepare("DELETE FROM user_files WHERE id = ? AND user_id = ?");
$stmt->bind_param('ii', $id, $_SESSION['user_id']);
if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Не удалось удалить запись']);
    $stmt->close();
    $db->close();
    exit;
}
$stmt->close();
$db->close();


if ($filePath && file_exists($filePath)) {
    @unlink($filePath);
}


echo json_encode(['status' => 'success']);
?>
