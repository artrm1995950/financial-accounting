<?php
session_start();
header('Content-Type: application/json');

if (empty($_SESSION['email'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}
echo json_encode(['email' => $_SESSION['email']]);
