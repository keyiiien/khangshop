// Tạo cơ sở dữ liệu, bảng và dữ liệu mẫu cho KhangShop.
//   npm run db:init   -> tạo mới nếu CSDL chưa có dữ liệu
//   npm run db:reset  -> XÓA toàn bộ CSDL rồi tạo lại từ đầu
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { config } from '../src/config.js';
import { slugify } from '../src/utils.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const reset = process.argv.includes('--reset');
const { database, ...server } = config.db;

// Tài khoản dùng để chạy thử, ghi lại trong README
const ACCOUNTS = [
  { fullName: 'Quản trị viên', email: 'admin@khangshop.local', phone: '0900000001', password: 'Admin@123', role: 'admin' },
  { fullName: 'Nguyễn Văn A', email: 'khach@khangshop.local', phone: '0900000012', password: 'Khach@123', role: 'customer' },
];

const CATEGORIES = [
  ['Điện tử', 'Tai nghe, bàn phím, sạc, loa và phụ kiện công nghệ.'],
  ['Thời trang', 'Áo, mũ, balo và phụ kiện thời trang.'],
  ['Nhà cửa & Đời sống', 'Đồ gia dụng, nhà bếp và trang trí.'],
  ['Sức khỏe & Làm đẹp', 'Chăm sóc da và sức khỏe hằng ngày.'],
  ['Mẹ & Bé', 'Đồ dùng cho mẹ và bé.'],
  ['Sách & Văn phòng phẩm', 'Sổ, bút và dụng cụ học tập.'],
  ['Thể thao', 'Dụng cụ và trang phục tập luyện.'],
  ['Thực phẩm', 'Đồ ăn vặt, trà và thực phẩm khô.'],
];

// [mã, tên, danh mục, giá, giá gốc, tồn kho, mô tả, đang bán]
const PRODUCTS = [
  ['TN-001', 'Tai nghe Bluetooth chống ồn chủ động', 'Điện tử', 1290000, 1590000, 32, 'Tai nghe chụp tai không dây với chế độ chống ồn chủ động (ANC), kết nối Bluetooth 5.3, sạc qua cổng USB-C. Đệm tai mềm, khung gấp gọn để mang theo.'],
  ['BP-002', 'Bàn phím cơ không dây', 'Điện tử', 990000, 1290000, 18, 'Bàn phím cơ kết nối Bluetooth và USB, đèn nền, phù hợp cả làm việc và chơi game.'],
  ['CH-011', 'Chuột không dây yên tĩnh', 'Điện tử', 249000, null, 40, 'Chuột không dây nút bấm êm, pin dùng lâu, kết nối bằng đầu thu USB.'],
  ['SN-012', 'Củ sạc nhanh 20W cổng USB-C', 'Điện tử', 189000, 230000, 60, 'Củ sạc nhỏ gọn hỗ trợ sạc nhanh 20W cho điện thoại và máy tính bảng.'],
  ['LO-013', 'Loa Bluetooth chống nước', 'Điện tử', 690000, null, 15, 'Loa di động chống nước, âm thanh mạnh, phù hợp dã ngoại.'],
  ['CA-014', 'Cáp USB-C bện dù 1m', 'Điện tử', 99000, null, 150, 'Cáp sạc và truyền dữ liệu USB-C, vỏ bện dù bền chắc.'],
  ['SD-015', 'Sạc dự phòng 10.000mAh', 'Điện tử', 399000, 459000, 25, 'Pin sạc dự phòng dung lượng 10.000mAh, hai cổng sạc.'],
  ['AT-005', 'Áo thun cotton unisex form rộng', 'Thời trang', 189000, null, 120, 'Áo thun 100% cotton, form rộng, mặc được cho cả nam và nữ.'],
  ['BL-018', 'Balo laptop 15.6 inch chống nước', 'Thời trang', 459000, null, 30, 'Balo nhiều ngăn, có ngăn chống sốc cho laptop đến 15.6 inch.'],
  ['MU-019', 'Mũ lưỡi trai kaki', 'Thời trang', 129000, null, 45, 'Mũ lưỡi trai vải kaki, khóa điều chỉnh vòng đầu.'],
  ['NC-003', 'Nồi chiên không dầu 5 lít', 'Nhà cửa & Đời sống', 1450000, 1890000, 4, 'Nồi chiên không dầu dung tích 5 lít, điều chỉnh nhiệt độ và hẹn giờ.'],
  ['BG-004', 'Bình giữ nhiệt inox 750ml', 'Nhà cửa & Đời sống', 159000, 199000, 56, 'Bình giữ nhiệt inox hai lớp, giữ nóng và lạnh nhiều giờ.'],
  ['DB-016', 'Đèn bàn LED chống cận', 'Nhà cửa & Đời sống', 329000, 399000, 22, 'Đèn bàn LED ánh sáng dịu, chỉnh được độ sáng và nhiệt độ màu.'],
  ['HT-017', 'Bộ 3 hộp thủy tinh đựng thực phẩm', 'Nhà cửa & Đời sống', 279000, null, 35, 'Hộp thủy tinh chịu nhiệt, nắp kín, dùng được trong lò vi sóng.'],
  ['KC-007', 'Kem chống nắng SPF50+ 50ml', 'Sức khỏe & Làm đẹp', 245000, 290000, 0, 'Kem chống nắng phổ rộng SPF50+, kết cấu mỏng nhẹ.'],
  ['SR-021', 'Sữa rửa mặt dịu nhẹ 150ml', 'Sức khỏe & Làm đẹp', 165000, null, 48, 'Sữa rửa mặt dịu nhẹ, phù hợp da nhạy cảm.'],
  ['XD-009', 'Xe đẩy em bé gấp gọn', 'Mẹ & Bé', 1890000, null, 7, 'Xe đẩy gấp gọn một tay, có mái che và giỏ đựng đồ.', false],
  ['KS-023', 'Khăn sữa cotton (bộ 5 chiếc)', 'Mẹ & Bé', 119000, null, 60, 'Khăn sữa cotton mềm, thấm hút tốt.'],
  ['ST-008', 'Sổ tay bìa da A5', 'Sách & Văn phòng phẩm', 79000, null, 200, 'Sổ tay khổ A5, bìa da, giấy dày không thấm mực.'],
  ['BV-022', 'Bộ bút gel 10 màu', 'Sách & Văn phòng phẩm', 59000, null, 90, 'Bộ 10 bút gel nhiều màu, nét 0.5mm.'],
  ['GC-006', 'Giày chạy bộ êm nhẹ', 'Thể thao', 690000, 890000, 3, 'Giày chạy bộ đế êm, thoáng khí, trọng lượng nhẹ.'],
  ['TY-010', 'Thảm tập yoga TPE 6mm', 'Thể thao', 199000, 249000, 5, 'Thảm tập yoga chất liệu TPE dày 6mm, chống trượt hai mặt.'],
  ['DN-020', 'Dây nhảy thể dục có đếm số', 'Thể thao', 89000, null, 70, 'Dây nhảy có bộ đếm số vòng, tay cầm chống trượt.'],
  ['HD-024', 'Hạt điều rang muối 500g', 'Thực phẩm', 189000, 215000, 40, 'Hạt điều rang muối, đóng hũ 500g.'],
  ['TX-025', 'Trà xanh túi lọc (hộp 100 gói)', 'Thực phẩm', 99000, null, 55, 'Trà xanh túi lọc tiện lợi, hộp 100 gói.'],
];

// Đơn hàng mẫu: [số phút trước, tên, sđt, tỉnh, phường, phương thức thanh toán, trạng thái, [[mã SP, SL]], của khách mẫu]
const ORDERS = [
  [3 * 24 * 60 - 60, 'Bùi Thị H', '0900000123', 'TP. Hồ Chí Minh', 'Phường Bến Thành', 'cod', 'da_giao', [['KC-007', 1]]],
  [3 * 24 * 60 - 600, 'Đặng Văn G', '0900000890', 'Hà Nội', 'Phường Hoàng Liệt', 'bank', 'da_giao', [['BP-002', 1], ['CA-014', 1]]],
  [2 * 24 * 60 - 120, 'Vũ Thị F', '0900000567', 'Hải Phòng', 'Phường Hồng Bàng', 'cod', 'da_huy', [['DB-016', 1]]],
  [2 * 24 * 60 - 480, 'Hoàng Văn E', '0900000234', 'Cần Thơ', 'Phường Ninh Kiều', 'bank', 'dang_giao', [['GC-006', 1]]],
  [24 * 60 - 60, 'Phạm Thị D', '0900000901', 'Hà Nội', 'Phường Hoàng Liệt', 'cod', 'dang_giao', [['TY-010', 1], ['ST-008', 1]]],
  [300, 'Lê Văn C', '0900000678', 'Đà Nẵng', 'Phường Hải Châu', 'cod', 'da_xac_nhan', [['NC-003', 1]]],
  [120, 'Trần Thị B', '0900000345', 'TP. Hồ Chí Minh', 'Phường Bến Thành', 'bank', 'cho_xac_nhan', [['BL-018', 1]]],
  [20, 'Nguyễn Văn A', '0900000012', 'Hà Nội', 'Phường Hoàng Liệt', 'cod', 'cho_xac_nhan', [['TN-001', 1], ['BG-004', 2], ['AT-005', 1]], true],
];

const FLOW = ['cho_xac_nhan', 'da_xac_nhan', 'dang_giao', 'da_giao'];

async function main() {
  const conn = await mysql.createConnection({ ...server, multipleStatements: true, timezone: '+07:00' });
  await conn.query("SET time_zone = '+07:00'");

  const [[existing]] = await conn.query('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?', [database]);
  if (existing && !reset) {
    const [[{ tables }]] = await conn.query(
      'SELECT COUNT(*) AS tables FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
      [database],
    );
    if (tables > 0) {
      console.log(`CSDL "${database}" đã có dữ liệu. Muốn xóa và tạo lại, chạy: npm run db:reset`);
      await conn.end();
      return;
    }
  }
  if (reset) await conn.query(`DROP DATABASE IF EXISTS \`${database}\``);
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${database}\``);
  await conn.query(await fs.readFile(path.join(here, '..', 'database', 'schema.sql'), 'utf8'));

  const userIds = {};
  for (const acc of ACCOUNTS) {
    const hash = await bcrypt.hash(acc.password, 10);
    const [r] = await conn.query(
      'INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [acc.fullName, acc.email, acc.phone, hash, acc.role],
    );
    userIds[acc.role] = r.insertId;
  }

  const categoryIds = {};
  for (const [i, [name, description]] of CATEGORIES.entries()) {
    const [r] = await conn.query('INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)', [
      name, slugify(name), description, i + 1,
    ]);
    categoryIds[name] = r.insertId;
  }

  const products = {};
  for (const [i, [sku, name, cat, price, oldPrice, stock, description, visible = true]] of PRODUCTS.entries()) {
    const [r] = await conn.query(
      `INSERT INTO products (category_id, sku, name, slug, description, price, old_price, stock, is_visible, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW() - INTERVAL ? DAY)`,
      [categoryIds[cat], sku, name, slugify(name), description, price, oldPrice, stock, visible, PRODUCTS.length - i],
    );
    products[sku] = { id: r.insertId, name, price };
  }

  for (const [minutesAgo, name, phone, province, ward, payment, status, items, mine] of ORDERS) {
    const subtotal = items.reduce((sum, [sku, qty]) => sum + products[sku].price * qty, 0);
    const [r] = await conn.query(
      `INSERT INTO orders (code, user_id, customer_name, phone, province, ward, address_detail, shipping_method,
         shipping_fee, payment_method, subtotal, total, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'standard', 30000, ?, ?, ?, ?, NOW() - INTERVAL ? MINUTE)`,
      [
        `T${minutesAgo}`, mine ? userIds.customer : null, name, phone, province, ward, 'Số nhà mẫu, đường mẫu',
        payment, subtotal, subtotal + 30000, status, minutesAgo,
      ],
    );
    const orderId = r.insertId;
    await conn.query(
      "UPDATE orders SET code = CONCAT('DH', DATE_FORMAT(created_at, '%y%m%d'), '-', LPAD(id, 4, '0')) WHERE id = ?",
      [orderId],
    );
    await conn.query('INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity) VALUES ?', [
      items.map(([sku, qty]) => [orderId, products[sku].id, products[sku].name, products[sku].price, qty]),
    ]);
    const steps = status === 'da_huy' ? ['cho_xac_nhan', 'da_huy'] : FLOW.slice(0, FLOW.indexOf(status) + 1);
    for (const [i, step] of steps.entries()) {
      await conn.query(
        'INSERT INTO order_status_history (order_id, status, created_at) VALUES (?, ?, NOW() - INTERVAL ? MINUTE)',
        [orderId, step, Math.max(minutesAgo - i * 90, 0)],
      );
    }
  }

  console.log(`Đã tạo CSDL "${database}": ${CATEGORIES.length} danh mục, ${PRODUCTS.length} sản phẩm, ${ORDERS.length} đơn hàng mẫu.`);
  console.log('Tài khoản thử nghiệm: xem mục "Tài khoản dùng thử" trong README.md');
  await conn.end();
}

main().catch((err) => {
  console.error('Không khởi tạo được CSDL:', err.message);
  if (err.code === 'ER_ACCESS_DENIED_ERROR') console.error('Kiểm tra DB_USER và DB_PASSWORD trong server/.env');
  process.exit(1);
});
