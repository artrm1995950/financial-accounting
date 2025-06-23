<?php

session_start();
header('Content-Type: application/json; charset=utf-8');









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


$category = trim($_GET['ticker'] ?? '');
if ($category === '') {
    echo json_encode([]);
    exit;
}


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
