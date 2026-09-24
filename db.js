const mysql = require('mysql2');

// ตั้งค่า Connection Pool
const pool = mysql.createPool({
  host: '119.59.102.161', // หรือ 'localhost' หากรัน Node.js อยู่บนเครื่อง Server เดียวกัน
  user: 'std6730251484',           // Username ของ MySQL คุณ
  password: 'Tukkata26211##',           // รหัสผ่านของ MySQL คุณ
  database: 'ip_std6730251484',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool.promise();