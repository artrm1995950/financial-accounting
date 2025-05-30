<?php
session_start();

// Проверяем, авторизован ли пользователь
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        "status" => "error",
        "message" => "Пользователь не авторизован."
    ]);
    exit;
}

// Проверяем, что запрос отправлен методом POST и файл передан
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['file'])) {
    // Подключаемся к базе данных
    $conn = new mysqli("localhost", "root", "password", "finychet");
    if ($conn->connect_error) {
        echo json_encode([
            "status" => "error",
            "message" => "Ошибка подключения к БД: " . $conn->connect_error
        ]);
        exit;
    }
    
    // Путь к папке для сохранения файлов
    $uploadDir = "C:\\Users\\79969\\Desktop\\FileFinance\\";
    
    // Получаем ID пользователя из сессии
    $userId = $_SESSION['user_id'];
    
    // Получаем банк из POST (если передан), иначе ставим "unknown"
    $bank = isset($_POST['bank']) ? $_POST['bank'] : "unknown";
    
    // Генерируем уникальное имя файла, добавляя ID пользователя
    $uniqueName = $userId . "_" . uniqid() . "_" . basename($_FILES["file"]["name"]);
    $targetPath = $uploadDir . $uniqueName;
    
    // Перемещаем файл из временной директории в постоянное место
    if (move_uploaded_file($_FILES["file"]["tmp_name"], $targetPath)) {
        // После успешного сохранения файла, записываем информацию в таблицу user_files
        $stmt = $conn->prepare("INSERT INTO user_files (user_id, file_path, bank) VALUES (?, ?, ?)");
        $stmt->bind_param("iss", $userId, $targetPath, $bank);
        if ($stmt->execute()) {
            echo json_encode([
                "status" => "success",
                "filePath" => $targetPath
            ]);
        } else {
            echo json_encode([
                "status" => "error",
                "message" => "Ошибка записи в БД: " . $stmt->error
            ]);
        }
        $stmt->close();
    } else {
        echo json_encode([
            "status" => "error",
            "message" => "Ошибка сохранения файла."
        ]);
    }
    $conn->close();
} else {
    echo json_encode([
        "status" => "error",
        "message" => "Файл не передан."
    ]);
}
?>
