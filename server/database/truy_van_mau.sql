-- Các câu truy vấn xem dữ liệu KhangShop (chỉ đọc, không thay đổi dữ liệu)
-- Trong MySQL Workbench (bản mới): chuột phải một bảng > Select Rows để mở tab DB Notebook,
-- sau đó dán MỘT câu dưới đây vào dòng "sql>" cuối cùng và bấm Ctrl + Enter.
USE khangshop;

-- 1. Danh sách bảng
SHOW TABLES;

-- 2. Danh mục và số sản phẩm
SELECT c.id, c.name AS danh_muc, COUNT(p.id) AS so_san_pham
FROM categories c LEFT JOIN products p ON p.category_id = c.id
GROUP BY c.id ORDER BY c.sort_order;

-- 3. Sản phẩm (giá, tồn kho, đang bán hay ẩn)
SELECT p.id, p.sku, p.name, c.name AS danh_muc, p.price AS gia_ban, p.old_price AS gia_goc,
       p.stock AS ton_kho, IF(p.is_visible, 'Đang bán', 'Đang ẩn') AS trang_thai
FROM products p JOIN categories c ON c.id = p.category_id
ORDER BY p.id;

-- 4. Sản phẩm sắp hết hàng (tồn kho <= 5)
SELECT sku, name, stock FROM products WHERE stock <= 5 ORDER BY stock;

-- 5. Đơn hàng, mới nhất trước
SELECT code AS ma_don, customer_name AS khach_hang, phone, province, total AS tong_tien,
       payment_method AS thanh_toan, status AS trang_thai, created_at AS ngay_dat
FROM orders ORDER BY created_at DESC;

-- 6. Sản phẩm trong đơn hàng mới nhất
SELECT o.code AS ma_don, oi.product_name AS san_pham, oi.unit_price AS don_gia, oi.quantity AS so_luong,
       oi.unit_price * oi.quantity AS thanh_tien
FROM orders o JOIN order_items oi ON oi.order_id = o.id
WHERE o.id = (SELECT MAX(id) FROM orders);

-- 7. Lịch sử đổi trạng thái đơn hàng
SELECT o.code AS ma_don, h.status AS trang_thai, h.created_at AS thoi_gian
FROM order_status_history h JOIN orders o ON o.id = h.order_id
ORDER BY h.created_at DESC LIMIT 30;

-- 8. Số đơn theo trạng thái
SELECT status AS trang_thai, COUNT(*) AS so_don FROM orders GROUP BY status;

-- 9. Giá trị đơn hàng theo ngày (không tính đơn đã hủy)
SELECT DATE(created_at) AS ngay, COUNT(*) AS so_don, SUM(total) AS gia_tri
FROM orders WHERE status <> 'da_huy'
GROUP BY DATE(created_at) ORDER BY ngay DESC;

-- 10. Sản phẩm bán chạy
SELECT oi.product_name AS san_pham, SUM(oi.quantity) AS da_ban
FROM order_items oi JOIN orders o ON o.id = oi.order_id AND o.status <> 'da_huy'
GROUP BY oi.product_name ORDER BY da_ban DESC LIMIT 10;

-- 11. Tài khoản (không lấy cột mật khẩu đã băm)
SELECT id, full_name AS ho_ten, email, phone, role AS vai_tro, created_at AS ngay_tao FROM users;
