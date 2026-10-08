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
import { UPLOAD_DIR } from '../src/upload.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const reset = process.argv.includes('--reset');
const UPLOAD_PRODUCT_DIR = path.join(UPLOAD_DIR, 'products');
const { database, ...server } = config.db;

// Tài khoản dùng để chạy thử, ghi lại trong README
const ACCOUNTS = [
  { fullName: 'Quản trị viên', email: 'admin@khangshop.local', phone: '0900000001', password: 'Admin@123', role: 'admin' },
  { fullName: 'Nguyễn Văn A', email: 'khach@khangshop.local', phone: '0900000012', password: 'Khach@123', role: 'customer' },
];

const CATEGORIES = [
  ['Điện tử', 'Tai nghe, đồng hồ thông minh, bàn phím, sạc và phụ kiện công nghệ.'],
  ['Thời trang', 'Áo, quần, váy, túi, ví và phụ kiện thời trang.'],
  ['Nhà cửa & Đời sống', 'Đồ gia dụng, nhà bếp, trang trí và cây cảnh.'],
  ['Sức khỏe & Làm đẹp', 'Chăm sóc da, tóc, trang điểm và sức khỏe hằng ngày.'],
  ['Mẹ & Bé', 'Đồ dùng, đồ chơi và quần áo cho bé.'],
  ['Sách & Văn phòng phẩm', 'Sổ, bút, dụng cụ học tập và văn phòng.'],
  ['Thể thao', 'Dụng cụ tập luyện, bóng và phụ kiện thể thao.'],
  ['Thực phẩm', 'Hạt, ngũ cốc, cà phê, trà và thực phẩm khô.'],
];

// Sản phẩm mẫu và ảnh: database/san_pham_mau.json, database/anh-san-pham/<mã>.jpg (nguồn ảnh: NGUON_ANH.md)
const DATA_DIR = path.join(here, '..', 'database');
const SEED_IMAGE_DIR = path.join(DATA_DIR, 'anh-san-pham');
const PRODUCTS = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'san_pham_mau.json'), 'utf8'));

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

  // Ảnh mẫu được chép vào uploads/products với tiền tố seed- để dễ dọn khi tạo lại dữ liệu
  await fs.mkdir(UPLOAD_PRODUCT_DIR, { recursive: true });
  for (const f of await fs.readdir(UPLOAD_PRODUCT_DIR)) {
    if (f.startsWith('seed-')) await fs.rm(path.join(UPLOAD_PRODUCT_DIR, f));
  }
  const products = {};
  for (const [i, p] of PRODUCTS.entries()) {
    let imageUrl = null;
    const image = path.join(SEED_IMAGE_DIR, `${p.sku}.jpg`);
    if (await fs.access(image).then(() => true, () => false)) {
      await fs.copyFile(image, path.join(UPLOAD_PRODUCT_DIR, `seed-${p.sku}.jpg`));
      imageUrl = `/uploads/products/seed-${p.sku}.jpg`;
    }
    const [r] = await conn.query(
      `INSERT INTO products (category_id, sku, name, slug, description, price, old_price, stock, image_url, is_visible, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW() - INTERVAL ? DAY)`,
      [categoryIds[p.cat], p.sku, p.name, slugify(p.name), p.desc, p.price, p.old, p.stock, imageUrl, p.visible ?? true,
        PRODUCTS.length - i],
    );
    products[p.sku] = { id: r.insertId, name: p.name, price: p.price };
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
