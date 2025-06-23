<?php


session_start();
header('Content-Type: application/octet-stream; charset=utf-8');


if (empty($_SESSION['user_id'])) {
    http_response_code(403);
    exit('Forbidden');
}


if (!isset($_GET['id'])) {
    http_response_code(400);
    exit('Bad Request');
}
$id = (int)$_GET['id'];
if ($id <= 0) {
    http_response_code(400);
    exit('Bad Request');
}


$db = new mysqli('localhost','root','password','finychet');
if ($db->connect_error) {
    http_response_code(500);
    exit('DB Connection Error');
}
$db->set_charset('utf8mb4');


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


$filename = basename($path);


header('Content-Description: File Transfer');
header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Expires: 0');
header('Cache-Control: must-revalidate');
header('Pragma: public');
header('Content-Length: ' . filesize($path));


readfile($path);
exit;
