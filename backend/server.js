const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Mock Data พนักงานอย่างน้อย 5 คน (ตามโจทย์ Phase 1)
let employees = [
  { id: '1', name: 'John Doe', position: 'Software Engineer', status: 'Active', salary: 45000 },
  { id: '2', name: 'Jane Smith', position: 'HR Specialist', status: 'Active', salary: 28000 },
  { id: '3', name: 'Alex Johnson', position: 'Senior Developer', status: 'On Leave', salary: 85000 },
  { id: '4', name: 'Emily Davis', position: 'Junior Designer', status: 'Active', salary: 22000 },
  { id: '5', name: 'Michael Brown', position: 'CTO', status: 'Active', salary: 120000 },
];

// --- 2. Phase 1: Authentication & CRUD Endpoints ---

// POST /api/login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'password123') {
    return res.status(200).json({ success: true, token: 'mock-jwt-token' });
  }
  return res.status(401).json({ success: false, message: 'Invalid username or password' });
});

// GET /api/employees - ดึงข้อมูลพนักงานทั้งหมด
app.get('/api/employees', (req, res) => {
  res.status(200).json(employees);
});

// POST /api/employees - เพิ่มพนักงานใหม่
app.post('/api/employees', (req, res) => {
  const { name, position, salary } = req.body;
  
  // Validation: ห้ามปล่อยว่าง
  if (!name || !position || salary === undefined || salary === '') {
    return res.status(400).json({ success: false, message: 'All fields (name, position, salary) are required.' });
  }

  const newEmployee = {
    id: Date.now().toString(),
    name,
    position,
    status: 'Active',
    salary: Number(salary),
  };

  employees.push(newEmployee);
  res.status(201).json({ success: true, data: newEmployee });
});

// PUT /api/employees/:id/status - สลับสถานะพนักงาน (Active <-> On Leave)
app.put('/api/employees/:id/status', (req, res) => {
  const { id } = req.params;
  const emp = employees.find(e => e.id === id);

  if (!emp) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }

  emp.status = emp.status === 'Active' ? 'On Leave' : 'Active';
  res.status(200).json({ success: true, data: emp });
});

// DELETE /api/employees/:id - ลบพนักงาน
app.delete('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  const initialLength = employees.length;
  employees = employees.filter(e => e.id !== id);

  if (employees.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }

  res.status(200).json({ success: true, message: 'Employee deleted successfully' });
});


// --- 3. Phase 2: K-Means Clustering (k=3) ---

// ฟังก์ชันคำนวณ 1D K-Means Clustering
function calculateKMeans(salaries, k = 3, maxIterations = 100) {
  if (salaries.length === 0) return [];
  if (salaries.length < k) {
    // ถ้าจำนวนพนักงานน้อยกว่า k ให้ปรับตามจริง
    k = salaries.length;
  }

  // เรียงลำดับเงินเดือนเพื่อกำหนดจุด Centroid เริ่มต้น
  const sorted = [...salaries].sort((a, b) => a - b);
  let centroids = [];
  for (let i = 0; i < k; i++) {
    const idx = Math.floor((i / (k - 1 || 1)) * (sorted.length - 1));
    centroids.push(sorted[idx]);
  }

  let clusters = Array.from({ length: k }, () => []);

  for (let iter = 0; iter < maxIterations; iter++) {
    clusters = Array.from({ length: k }, () => []);

    // จัดกลุ่มข้อมูลเข้าหา Centroid ที่ใกล้ที่สุด
    salaries.forEach(salary => {
      let minDistance = Infinity;
      let clusterIndex = 0;

      centroids.forEach((centroid, idx) => {
        const distance = Math.abs(salary - centroid);
        if (distance < minDistance) {
          minDistance = distance;
          clusterIndex = idx;
        }
      });

      clusters[clusterIndex].push(salary);
    });

    // คำนวณ Centroid ใหม่
    let newCentroids = clusters.map((cluster, idx) => {
      if (cluster.length === 0) return centroids[idx];
      const sum = cluster.reduce((acc, val) => acc + val, 0);
      return sum / cluster.length;
    });

    // ตรวจสอบว่า Centroid ไม่เปลี่ยนแล้ว (Convergence)
    let isConverged = centroids.every((val, idx) => Math.abs(val - newCentroids[idx]) < 0.001);
    centroids = newCentroids;

    if (isConverged) break;
  }

  // จัดรูปแบบผลลัพธ์ส่งกลับ (เรียงจากน้อยไปมากเป็น Tier 1, Tier 2, Tier 3)
  const result = centroids.map((centroid, idx) => ({
    centroid,
    count: clusters[idx].length,
  })).sort((a, b) => a.centroid - b.centroid);

  return result.map((item, idx) => ({
    group: `Tier ${idx + 1}`,
    centroid: Math.round(item.centroid),
    count: item.count,
  }));
}

// GET /api/employees/salary-clusters - คืนค่าสถิติ K-Means
app.get('/api/employees/salary-clusters', (req, res) => {
  const salaries = employees.map(e => e.salary);
  const clusters = calculateKMeans(salaries, 3);

  res.status(200).json({
    success: true,
    clusters: clusters
  });
});

// เริ่มต้นรันเซิร์ฟเวอร์ที่ Port 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend Server running on http://localhost:${PORT}`);
});