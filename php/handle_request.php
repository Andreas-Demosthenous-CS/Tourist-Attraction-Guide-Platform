<?php
class Request
{

    public $timestamp;
    public $address;
    public $region;
    public $city;

    function __construct($timestamp, $address, $region, $city)
    {
        $this->timestamp = $timestamp;
        $this->address = $address;
        $this->region = $region;
        $this->city = $city;
    }
}

if ($_SERVER["REQUEST_METHOD"] == "POST" && $_SERVER["CONTENT_TYPE"] == "application/json") {

    $data = file_get_contents("php://input");

    if (empty($data) || !($json = json_decode($data))) {
        http_response_code(400);
        echo "400 Bad Request";
        exit();
    }

    $decoded_data = json_decode($data);

    // The keys are present in the array
    $user = $decoded_data->username;
    $address = $decoded_data->address;
    $region = $decoded_data->region;
    $city = $decoded_data->city;

    $timestamp = time();
 

    $conn = mysqli_connect("dbserver.in.cs.ucy.ac.cy", "student", "gtNgMF8pZyZq6l53", "epl425");

    if (!$conn) {
        http_response_code(500);
        echo "500 Server Error";
        exit();
    }
    echo "Connected succesfully";

    $query = "INSERT INTO requests (username, timestamp, address, region, city, country) VALUES ('" . $user . "', " . $timestamp . ", '" . $address . "', '" . $region . "', '" . $city . "', ' - ')";
    $result = mysqli_query($conn, $query);
    if (!$result) {
        http_response_code(500);
        echo "Error (" . mysqli_errno($conn) . ") " . mysqli_error($conn);
        // echo "500 Server Error";
        exit();
    }

    http_response_code(201);
    echo "201 Created";

    $conn->close();

} else if ($_SERVER["REQUEST_METHOD"] == "GET") {

    if (empty($_GET["username"])) {
        http_response_code(400);
        echo "400 Bad Request1";
        exit();
    }

    if (isset($_GET['username'])) {
        $username = $_GET['username'];
    } else {
        http_response_code(400);
        echo "400 Bad Request2";
        exit();
    }

    $conn = mysqli_connect("dbserver.in.cs.ucy.ac.cy", "student", "gtNgMF8pZyZq6l53", "epl425");
    
    if (!$conn) {
        http_response_code(500);
        echo "500 Server Error";
        exit();
    }

    $query = ("SELECT * FROM requests WHERE username='" . $username . "' ORDER BY timestamp DESC LIMIT 5");
    $result = mysqli_query($conn, $query)
        or die("Invalid query");

    if (!$result) {
        http_response_code(500);
        echo "500 Server Error";
        exit();
    }

    $requests = array();

    while ($row = mysqli_fetch_row($result)) {
        $requests[] = new Request($row[2], $row[3], $row[4], $row[5]);
    }

    // Set the content type header
    header("Content-type: application/json");



    http_response_code(200);

    echo json_encode($requests);
    // echo "200 OK";

    $conn->close();
}

?>