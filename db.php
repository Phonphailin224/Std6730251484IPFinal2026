<?php
$host = '119.59.102.161'; // หรือ localhost ตามเซิร์ฟเวอร์ของคุณ
$dbname = 'ip_std6730251484';
$username = 'ชื่อผู้ใช้ฐานข้อมูล';
$password = 'รหัสผ่านฐานข้อมูล';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}
?>
<?php
require 'db.php';

if (isset($_GET['id'])) {
    $id = $_GET['id'];
    
    // เตรียมคำสั่ง SQL สำหรับลบข้อมูล
    $stmt = $pdo->prepare("DELETE FROM Inventory WHERE id = ?");
    $stmt->execute([$id]);
    
    // กลับไปยังหน้าแสดงสินค้า
    header("Location: index.php");
    exit();
}
?>
<?php
require 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = $_POST['product_id']; // รหัสสินค้า
    $qty = $_POST['quantity'];   // จำนวนที่ต้องการตัดออกจากสต็อก
    
    // คำสั่งอัปเดตลดสต็อก (ตรวจสอบว่า stock ต้องมีมากกว่าหรือเท่ากับจำนวนที่ซื้อด้วย)
    $stmt = $pdo->prepare("UPDATE Inventory SET stock = stock - ? WHERE id = ? AND stock >= ?");
    $stmt->execute([$qty, $id, $qty]);
    
    // เปลี่ยนเส้นทางหรือแจ้งเตือนว่าสำเร็จ
    header("Location: index.php");
    exit();
}
?>