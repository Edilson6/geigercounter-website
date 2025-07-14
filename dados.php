<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// Configurações de conexão com o banco de dados
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "radiation-monitor1";

// Cria a conexão com o MySQL
$conn = new mysqli($servername, $username, $password, $dbname);

// Verifica se a conexão falhou
if ($conn->connect_error) {
    die(json_encode(["status" => "error", "message" => "Connection failed: " . $conn->connect_error]));
}

// Verifica o método da requisição
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Lê os dados brutos da requisição POST
    $input = file_get_contents('php://input');
    parse_str($input, $_POST);
    
    // Valida campos obrigatórios
    if (!isset($_POST['datetime']) || !isset($_POST['cpm']) || !isset($_POST['usv'])) {
        echo json_encode(["status" => "error", "message" => "Missing required fields"]);
        exit;
    }
    
    // Prepara dados
    $datetime = $conn->real_escape_string($_POST['datetime']);
    $latitude = isset($_POST['latitude']) ? floatval($_POST['latitude']) : 0.0;
    $longitude = isset($_POST['longitude']) ? floatval($_POST['longitude']) : 0.0;
    $cpm = intval($_POST['cpm']);
    $usv = floatval($_POST['usv']);
    $level = $conn->real_escape_string($_POST['level']);
    
    // Atualiza dados atuais
    $conn->query("DELETE FROM current_data");
    
    $stmt = $conn->prepare("INSERT INTO current_data 
    (id, datetime, latitude, longitude, cpm, usv, radiation_level) 
    VALUES (1, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("sddids", $datetime, $latitude, $longitude, $cpm, $usv, $level);
    
    if (!$stmt->execute()) {
        echo json_encode(["status" => "error", "message" => "Error saving current data: " . $stmt->error]);
        $stmt->close();
        exit;
    }
    $stmt->close();
    
    // Insere dados históricos
    $stmt2 = $conn->prepare("INSERT INTO historical_data 
    (datetime, latitude, longitude, cpm, usv, radiation_level) 
    VALUES (?, ?, ?, ?, ?, ?)");
    $stmt2->bind_param("sddids", $datetime, $latitude, $longitude, $cpm, $usv, $level);
    
    if (!$stmt2->execute()) {
        echo json_encode(["status" => "error", "message" => "Error saving historical data: " . $stmt2->error]);
        $stmt2->close();
        exit;
    }
    $stmt2->close();
    
    echo json_encode(["status" => "success", "message" => "Data saved successfully"]);
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Retorna dados via GET
    if (isset($_GET['type'])) {
        if ($_GET['type'] == 'current') {
            $result = $conn->query("SELECT datetime, latitude, longitude, cpm, usv, radiation_level FROM current_data LIMIT 1");
            if ($result->num_rows > 0) {
                $data = $result->fetch_assoc();
                echo json_encode($data);
            } else {
                echo json_encode(["status" => "error", "message" => "No current data available"]);
            }
        } elseif ($_GET['type'] == 'historical') {
            $query = "SELECT 
                datetime, 
                latitude, 
                longitude, 
                cpm, 
                usv, 
                radiation_level 
              FROM historical_data";
            
            // Filtro por data
            if (isset($_GET['start']) && isset($_GET['end'])) {
                $start = $conn->real_escape_string($_GET['start']);
                $end = $conn->real_escape_string($_GET['end']);
                $query .= " WHERE datetime BETWEEN '$start 00:00:00' AND '$end 23:59:59'";
            }
            
            $query .= " ORDER BY datetime DESC";
            $result = $conn->query($query);
            
            $data = array();
            while ($row = $result->fetch_assoc()) {
                $data[] = $row;
            }
            echo json_encode($data);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Invalid request type"]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Invalid request method"]);
}

$conn->close();
?>