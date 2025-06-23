<?php

define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASSWORD', 'password'); 
define('DB_NAME', 'finychet'); 


$mysqli = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);


if ($mysqli->connect_error) {
    die("Ошибка подключения: " . $mysqli->connect_error);
}


if (isset($_POST['full_name'], $_POST['email'], $_POST['password'])) {
    $fullName = $_POST['full_name'];
    $email = $_POST['email'];
    $password = password_hash($_POST['password'], PASSWORD_DEFAULT);
    
    

    
    $checkQuery = $mysqli->prepare("SELECT id FROM users WHERE email = ?");
    if ($checkQuery === false) {
        die('Ошибка подготовки запроса: ' . $mysqli->error);
    }
    $checkQuery->bind_param("s", $email);
    $checkQuery->execute();
    $checkQuery->store_result();

    if ($checkQuery->num_rows > 0) {
        echo json_encode(['status' => 'error', 'message' => 'Этот email уже зарегистрирован.']);
    } else {
        
        $insertQuery = $mysqli->prepare("INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)");
        if ($insertQuery === false) {
            die('Ошибка подготовки запроса: ' . $mysqli->error);
        }
        $insertQuery->bind_param("sss", $fullName, $email, $password);

        if ($insertQuery->execute()) {
            echo json_encode(['status' => 'success', 'message' => 'Данные успешно записаны']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Ошибка при регистрации: ' . $insertQuery->error]);
        }
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Не все данные были переданы.']);
}


$mysqli->close();
?>
