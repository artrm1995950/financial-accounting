<?php
session_start();


define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASSWORD', 'password');
define('DB_NAME', 'finychet');

$conn = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email    = $_POST['email'];
    $password = $_POST['password'];

    $sql  = "SELECT * FROM users WHERE email = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();

        
            if ($password === $user['password']) {
                

            
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['email']   = $email;         
            $_SESSION['name']    = $user['name'];
            echo "Авторизация успешна!";
        } else {
            echo "Неверный пароль!";
        }
    } else {
        echo "Пользователь с таким email не найден.";
    }

    $stmt->close();
}

$conn->close();
