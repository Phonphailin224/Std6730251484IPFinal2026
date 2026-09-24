const express = require('express');
const mysql = require('mysql2/promise'); // หรือตัวเชื่อมต่อฐานข้อมูลที่คุณใช้
const app = express();

app.use(express.json());

// ตัวอย่างการตั้งค่า Database Pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'jut_fai_db' // ชื่อฐานข้อมูลของคุณ
});

// --- API ต่างๆ ที่คุณมีอยู่แล้ว ---
app.post('/api/login', async (req, res) => { ... });
app.get('/api/products', async (req, res) => { ... });
app.post('/api/products', async (req, res) => { ... });


// 📌 ==========================================
// 📌 นำโค้ด POST /api/orders มาวางไว้ตรงนี้ครับ!
// 📌 ==========================================
app.post('/api/orders', async (req, res) => {
  const { userId, paymentMethod, shippingName, shippingPhone, shippingAddress, totalPrice, items } = req.body;
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. บันทึกข้อมูลลงตาราง orders
    const [orderResult] = await connection.query(
      `INSERT INTO orders (user_id, payment_method, shipping_name, shipping_phone, shipping_address, total_price, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [userId, paymentMethod, shippingName, shippingPhone, shippingAddress, totalPrice]
    );
    
    const orderId = orderResult.insertId;
    const orderCode = 'JT-' + (100000 + orderId);

    // 2. บันทึกรายการสินค้าลงตาราง order_items และตัดสต็อกสินค้า
    for (let item of items) {
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`,
        [orderId, item.productId, item.quantity, item.price]
      );

      await connection.query(
        `UPDATE products SET stock = stock - ? WHERE id = ?`,
        [item.quantity, item.productId]
      );
    }

    await connection.commit();
    res.json({ success: true, orderId, orderCode });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});


// เริ่มต้นรันเซิร์ฟเวอร์
app.listen(3110, () => {
  console.log('Server is running on port 3110');
});