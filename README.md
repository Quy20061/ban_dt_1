# 🛍️ PhoneZone – Hướng dẫn cài đặt

## 📁 Cấu trúc file
```
phonezone/
├── index.html      ← Trang web frontend (chạy độc lập hoặc qua server)
├── server.js       ← Backend Node.js (SQLite + Email)
├── package.json    ← Dependencies
└── README.md
```

---

## 🚀 Cách 1: Chạy thẳng trên trình duyệt (không cần server)
1. Mở file `index.html` bằng trình duyệt (Chrome/Firefox)
2. Website hoạt động đầy đủ — đặt hàng chạy "demo mode" (không lưu DB, không gửi email)

---

## 🖥️ Cách 2: Chạy đầy đủ với Node.js (có SQLite + Gmail)

### Bước 1 – Cài Node.js
Tải tại: https://nodejs.org (chọn LTS)

### Bước 2 – Cài dependencies
```bash
# Mở terminal, vào thư mục chứa file
cd /đường/dẫn/phonezone

npm install
```

### Bước 3 – Cấu hình Gmail
Mở `server.js` và sửa phần `EMAIL_CONFIG`:
```js
const EMAIL_CONFIG = {
  user    : 'your.gmail@gmail.com',   // Gmail của bạn
  pass    : 'xxxx xxxx xxxx xxxx',    // App Password (16 ký tự)
  adminTo : 'your.gmail@gmail.com',   // Email nhận thông báo
};
```

**Cách lấy App Password Gmail:**
1. Bật xác minh 2 bước: https://myaccount.google.com/security
2. Tạo App Password: https://myaccount.google.com/apppasswords
3. Chọn "Mail" → tạo → copy 16 ký tự

### Bước 4 – Chạy server
```bash
node server.js
```

### Bước 5 – Mở trình duyệt
Truy cập: **http://localhost:3000**

---

## 🗄️ Database SQLite

File `phonezone.db` tự tạo khi server khởi động.

**Xem dữ liệu đơn hàng:**
```bash
# Cài sqlite3 CLI (tuỳ chọn)
npx sqlite3 phonezone.db "SELECT * FROM orders;"
```

**API endpoints:**
| Method | URL | Mô tả |
|--------|-----|-------|
| POST | /api/orders | Tạo đơn hàng |
| GET | /api/orders | Danh sách đơn |
| GET | /api/orders/:id | Chi tiết đơn |
| PATCH | /api/orders/:id/status | Cập nhật trạng thái |
| GET | /api/stats | Thống kê tổng quan |

---

## ✨ Tính năng

- ✅ 100 điện thoại (Apple, Samsung, Xiaomi, OPPO, Vivo, OnePlus, Realme)
- ✅ Tìm kiếm & lọc theo thương hiệu
- ✅ Sắp xếp theo giá, tên, mới nhất
- ✅ Giỏ hàng (thêm/xóa/xem)
- ✅ Đặt hàng có form thông tin
- ✅ 4 phương thức thanh toán: COD, Chuyển khoản, QR VietQR, MoMo
- ✅ Mã QR thanh toán tự tạo
- ✅ Lưu đơn hàng vào SQLite
- ✅ Gửi email thông báo cho admin
- ✅ Gửi email xác nhận cho khách
- ✅ Responsive mobile
# ban_dt_1
