// ============================================================
// PhoneZone Backend - server.js
// Yêu cầu: Node.js 16+
// Cài đặt: npm install express better-sqlite3 nodemailer cors
// Chạy:    node server.js
// ============================================================

const express    = require('express');
const cors       = require('cors');
const Database   = require('better-sqlite3');
const nodemailer = require('nodemailer');
const path       = require('path');

const app  = express();
const PORT = 3000;

// ─── MIDDLEWARE ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.'))); // Phục vụ index.html

// ─── CẤU HÌNH EMAIL ──────────────────────────────────────────
// ⚠️  Thay EMAIL và APP PASSWORD của bạn vào đây:
//    https://myaccount.google.com/apppasswords  (bật 2FA trước)
const EMAIL_CONFIG = {
  user    : 'your.gmail@gmail.com',   // ← SỬA
  pass    : 'xxxx xxxx xxxx xxxx',    // ← SỬA (App Password 16 ký tự)
  adminTo : 'your.gmail@gmail.com',   // ← Email nhận thông báo đơn hàng
};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: EMAIL_CONFIG.user, pass: EMAIL_CONFIG.pass },
});

// ─── DATABASE ────────────────────────────────────────────────
const db = new Database('phonezone.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id          TEXT PRIMARY KEY,
    cust_name   TEXT NOT NULL,
    cust_phone  TEXT NOT NULL,
    cust_email  TEXT,
    cust_address TEXT NOT NULL,
    note        TEXT,
    total       INTEGER NOT NULL,
    payment     TEXT NOT NULL,
    status      TEXT DEFAULT 'pending',
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    name       TEXT NOT NULL,
    brand      TEXT NOT NULL,
    price      INTEGER NOT NULL,
    qty        INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );
`);

const insertOrder = db.prepare(`
  INSERT INTO orders (id, cust_name, cust_phone, cust_email, cust_address, note, total, payment, created_at)
  VALUES (@id, @cust_name, @cust_phone, @cust_email, @cust_address, @note, @total, @payment, @created_at)
`);

const insertItem = db.prepare(`
  INSERT INTO order_items (order_id, product_id, name, brand, price, qty)
  VALUES (@order_id, @product_id, @name, @brand, @price, @qty)
`);

// Transaction để insert order + items cùng lúc
const saveOrder = db.transaction((order, items) => {
  insertOrder.run(order);
  for (const item of items) insertItem.run({ ...item, order_id: order.id });
});

// ─── HELPER: FORMAT TIỀN ─────────────────────────────────────
function formatVND(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

// ─── HELPER: GỬI EMAIL ───────────────────────────────────────
async function sendOrderEmails(order, items) {
  const itemRows = items.map(i =>
    `<tr>
       <td style="padding:8px 12px;border-bottom:1px solid #eee">${i.brand} ${i.name}</td>
       <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${i.qty}</td>
       <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${formatVND(i.price)}</td>
       <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${formatVND(i.price * i.qty)}</td>
     </tr>`
  ).join('');

  const payLabel = { cod:'Tiền mặt (COD)', bank:'Chuyển khoản', qr:'QR VietQR', momo:'Ví MoMo' };

  // ── Email gửi cho ADMIN ──────────────────────────────────────
  const adminHtml = `
  <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <div style="background:#6c63ff;color:white;padding:24px 32px;border-radius:12px 12px 0 0">
      <h1 style="margin:0;font-size:1.5rem">🛒 Đơn hàng mới!</h1>
      <p style="margin:6px 0 0;opacity:0.85">PhoneZone – ${new Date().toLocaleString('vi-VN')}</p>
    </div>
    <div style="background:#f9f9fb;padding:24px 32px">
      <h3 style="color:#333;margin-top:0">📋 Mã đơn: <span style="color:#6c63ff">${order.id}</span></h3>
      
      <h4 style="color:#555;margin-bottom:8px">👤 Thông tin khách hàng</h4>
      <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;margin-bottom:20px">
        <tr><td style="padding:8px 12px;color:#888;width:140px">Họ tên</td><td style="padding:8px 12px;font-weight:600">${order.cust_name}</td></tr>
        <tr style="background:#f5f5f5"><td style="padding:8px 12px;color:#888">Điện thoại</td><td style="padding:8px 12px;font-weight:600">${order.cust_phone}</td></tr>
        <tr><td style="padding:8px 12px;color:#888">Email</td><td style="padding:8px 12px">${order.cust_email || '(không có)'}</td></tr>
        <tr style="background:#f5f5f5"><td style="padding:8px 12px;color:#888">Địa chỉ</td><td style="padding:8px 12px">${order.cust_address}</td></tr>
        <tr><td style="padding:8px 12px;color:#888">Ghi chú</td><td style="padding:8px 12px">${order.note || '(không có)'}</td></tr>
        <tr style="background:#f5f5f5"><td style="padding:8px 12px;color:#888">Thanh toán</td><td style="padding:8px 12px">${payLabel[order.payment] || order.payment}</td></tr>
      </table>

      <h4 style="color:#555;margin-bottom:8px">📦 Sản phẩm đặt mua</h4>
      <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;margin-bottom:20px">
        <thead>
          <tr style="background:#6c63ff;color:white">
            <th style="padding:10px 12px;text-align:left">Sản phẩm</th>
            <th style="padding:10px 12px;text-align:center">SL</th>
            <th style="padding:10px 12px;text-align:right">Đơn giá</th>
            <th style="padding:10px 12px;text-align:right">Thành tiền</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr style="background:#fff8e1">
            <td colspan="3" style="padding:12px;text-align:right;font-weight:700;font-size:1.1rem">TỔNG CỘNG</td>
            <td style="padding:12px;text-align:right;font-weight:700;color:#e67e22;font-size:1.2rem">${formatVND(order.total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <div style="background:#333;color:#aaa;padding:16px 32px;border-radius:0 0 12px 12px;font-size:0.8rem;text-align:center">
      PhoneZone – Hệ thống tự động gửi email này. Vui lòng liên hệ khách hàng để xác nhận.
    </div>
  </div>`;

  // ── Email xác nhận gửi cho KHÁCH ─────────────────────────────
  const custHtml = order.cust_email ? `
  <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <div style="background:linear-gradient(135deg,#6c63ff,#9f84ff);color:white;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
      <div style="font-size:3rem">✅</div>
      <h1 style="margin:8px 0 4px;font-size:1.6rem">Đặt hàng thành công!</h1>
      <p style="margin:0;opacity:0.9">Cảm ơn bạn đã tin tưởng PhoneZone</p>
    </div>
    <div style="background:#f9f9fb;padding:24px 32px">
      <p style="color:#555">Xin chào <strong>${order.cust_name}</strong>,</p>
      <p style="color:#555">Chúng tôi đã nhận được đơn hàng <strong style="color:#6c63ff">${order.id}</strong> của bạn. Đội ngũ hỗ trợ sẽ liên hệ qua số <strong>${order.cust_phone}</strong> trong vòng 30 phút để xác nhận.</p>
      
      <div style="background:white;border-radius:10px;padding:16px;margin:16px 0">
        ${items.map(i=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0"><span>${i.brand} ${i.name} x${i.qty}</span><span style="font-weight:600">${formatVND(i.price*i.qty)}</span></div>`).join('')}
        <div style="display:flex;justify-content:space-between;padding:10px 0;font-weight:700;font-size:1.1rem;color:#6c63ff"><span>Tổng cộng</span><span>${formatVND(order.total)}</span></div>
      </div>

      <p style="color:#888;font-size:0.85rem">📞 Hotline: 1800 9090 &nbsp;|&nbsp; ✉️ info@phonezone.vn</p>
    </div>
    <div style="background:#333;color:#aaa;padding:14px;border-radius:0 0 12px 12px;font-size:0.8rem;text-align:center">
      © 2025 PhoneZone – Điện thoại chính hãng
    </div>
  </div>` : null;

  // Gửi email
  const sends = [
    transporter.sendMail({
      from   : `"PhoneZone" <${EMAIL_CONFIG.user}>`,
      to     : EMAIL_CONFIG.adminTo,
      subject: `🛒 Đơn hàng mới ${order.id} – ${order.cust_name} – ${formatVND(order.total)}`,
      html   : adminHtml,
    })
  ];

  if (custHtml && order.cust_email) {
    sends.push(transporter.sendMail({
      from   : `"PhoneZone" <${EMAIL_CONFIG.user}>`,
      to     : order.cust_email,
      subject: `✅ Xác nhận đơn hàng ${order.id} – PhoneZone`,
      html   : custHtml,
    }));
  }

  await Promise.all(sends);
}

// ─── API: TẠO ĐƠN HÀNG ──────────────────────────────────────
app.post('/api/orders', async (req, res) => {
  try {
    const { orderId, customer, items, total, payment, createdAt } = req.body;

    const order = {
      id          : orderId,
      cust_name   : customer.name,
      cust_phone  : customer.phone,
      cust_email  : customer.email || null,
      cust_address: customer.address,
      note        : customer.note || null,
      total,
      payment,
      created_at  : createdAt,
    };

    // Lưu vào SQLite
    saveOrder(order, items);
    console.log(`✅ Đơn hàng mới: ${orderId} – ${customer.name} – ${formatVND(total)}`);

    // Gửi email (không chặn response nếu lỗi email)
    sendOrderEmails(order, items).then(() => {
      console.log(`📧 Email đã gửi cho đơn ${orderId}`);
    }).catch(err => {
      console.error(`⚠️  Gửi email thất bại (kiểm tra cấu hình EMAIL_CONFIG):`, err.message);
    });

    res.json({ success: true, orderId });
  } catch (err) {
    console.error('Lỗi tạo đơn hàng:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── API: LẤY DANH SÁCH ĐƠN ─────────────────────────────────
app.get('/api/orders', (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, GROUP_CONCAT(i.name || ' x' || i.qty, ', ') AS item_summary
    FROM orders o
    LEFT JOIN order_items i ON o.id = i.order_id
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `).all();
  res.json(orders);
});

// ─── API: CHI TIẾT ĐƠN ──────────────────────────────────────
app.get('/api/orders/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
  res.json({ ...order, items });
});

// ─── API: CẬP NHẬT TRẠNG THÁI ───────────────────────────────
app.patch('/api/orders/:id/status', (req, res) => {
  const { status } = req.body; // pending | confirmed | shipping | delivered | cancelled
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

// ─── API: THỐNG KÊ ───────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  const total    = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
  const revenue  = db.prepare("SELECT SUM(total) as s FROM orders WHERE status != 'cancelled'").get().s || 0;
  const pending  = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'pending'").get().c;
  res.json({ total_orders: total, total_revenue: revenue, pending_orders: pending });
});

// ─── PHỤC VỤ TRANG WEB ──────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── START ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║   🚀 PhoneZone Server đang chạy!     ║');
  console.log(`║   🌐 http://localhost:${PORT}           ║`);
  console.log('║   📦 SQLite: phonezone.db            ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');
  console.log('API endpoints:');
  console.log('  POST   /api/orders       – Tạo đơn hàng');
  console.log('  GET    /api/orders       – Danh sách đơn');
  console.log('  GET    /api/orders/:id   – Chi tiết đơn');
  console.log('  PATCH  /api/orders/:id/status – Cập nhật trạng thái');
  console.log('  GET    /api/stats        – Thống kê');
  console.log('');
});
