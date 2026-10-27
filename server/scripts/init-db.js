// Tạo cơ sở dữ liệu, bảng và dữ liệu mẫu cho DailyCart.
//   npm run db:init   -> tạo mới nếu CSDL chưa có dữ liệu
//   npm run db:reset  -> XÓA toàn bộ CSDL rồi tạo lại từ đầu
import crypto from 'node:crypto';
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
  { fullName: 'Quản trị viên', email: 'admin@dailycart.local', phone: '0900000001', password: 'Admin@123', role: 'admin' },
  { fullName: 'Nguyễn Văn A', email: 'khach@dailycart.local', phone: '0900000012', password: 'Khach@123', role: 'customer' },
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

// Khách hàng mẫu chỉ để có lịch sử mua hàng và đánh giá; mật khẩu sinh ngẫu nhiên nên không đăng nhập được
const SAMPLE_CUSTOMERS = [
  ['Trần Minh Anh', 'minhanh@dailycart.local', '0900000101', 'Hà Nội', 'Phường Cầu Giấy'],
  ['Lê Thu Hà', 'thuha@dailycart.local', '0900000102', 'Đà Nẵng', 'Phường Hải Châu'],
  ['Phạm Quốc Bảo', 'quocbao@dailycart.local', '0900000103', 'TP. Hồ Chí Minh', 'Phường Bến Thành'],
  ['Đỗ Ngọc Lan', 'ngoclan@dailycart.local', '0900000104', 'Hải Phòng', 'Phường Hồng Bàng'],
  ['Vũ Đức Huy', 'duchuy@dailycart.local', '0900000105', 'Cần Thơ', 'Phường Ninh Kiều'],
];

// Mã giảm giá mẫu: [mã, mô tả, loại, mức giảm, giảm tối đa, đơn tối thiểu, giới hạn lượt, số ngày đến hạn (âm = đã hết hạn)]
const COUPONS = [
  ['KHANG10', 'Giảm 10% tiền hàng, tối đa 50.000₫ cho đơn từ 200.000₫', 'percent', 10, 50000, 200000, null, 60],
  ['GIAM30K', 'Giảm 30.000₫ cho đơn từ 300.000₫', 'fixed', 30000, null, 300000, 100, 30],
  ['CHAOBAN', 'Giảm 15% cho khách mới, tối đa 40.000₫', 'percent', 15, 40000, 0, 1, 30],
  ['HE2026', 'Khuyến mãi hè 2026 (đã kết thúc)', 'percent', 20, 100000, 0, null, -30],
];

// Nhận xét mẫu theo số sao
const COMMENTS = {
  5: ['Hàng đúng mô tả, đóng gói cẩn thận, giao nhanh.', 'Rất hài lòng, sẽ ủng hộ cửa hàng lần sau.',
    'Chất lượng tốt so với giá, dùng ổn.', 'Sản phẩm đẹp như hình, nhân viên tư vấn nhiệt tình.'],
  4: ['Sản phẩm tốt, giao hơi chậm một ngày.', 'Dùng ổn, đóng gói có thể kỹ hơn.', 'Đúng mô tả, giá hợp lý.'],
  3: ['Tạm được, chất lượng ở mức trung bình.', 'Hàng dùng được nhưng màu hơi khác ảnh.'],
};

// Bộ sinh số giả ngẫu nhiên có hạt giống cố định: mỗi lần tạo lại CSDL cho cùng một bộ dữ liệu mẫu
function seeded(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

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
  const sampleCustomers = [];
  for (const [i, [fullName, email, phone, province, ward]] of SAMPLE_CUSTOMERS.entries()) {
    const hash = await bcrypt.hash(crypto.randomUUID(), 10);
    const [r] = await conn.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, created_at)
       VALUES (?, ?, ?, ?, 'customer', NOW() - INTERVAL ? DAY)`,
      [fullName, email, phone, hash, 40 - i * 3],
    );
    sampleCustomers.push({ id: r.insertId, fullName, phone, province, ward });
  }

  const couponByCode = {};
  for (const [code, description, type, value, maxDiscount, minOrder, usageLimit, days] of COUPONS) {
    await conn.query(
      `INSERT INTO coupons (code, description, type, value, max_discount, min_order, usage_limit, starts_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW() - INTERVAL 90 DAY, NOW() + INTERVAL ? DAY)`,
      [code, description, type, value, maxDiscount, minOrder, usageLimit, days],
    );
    couponByCode[code] = { type, value, maxDiscount, minOrder };
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

  // Lịch sử mua hàng 30 ngày gần đây của khách hàng mẫu (để trang thống kê và phần đánh giá có dữ liệu).
  // Chỉ gồm đơn đã giao hoặc đã hủy, nên không làm thay đổi số đơn đang chờ xử lý.
  const random = seeded(20261014);
  const pick = (list) => list[Math.floor(random() * list.length)];
  const sellable = PRODUCTS.filter((p) => p.visible !== false && p.stock >= 10 && p.price <= 1500000);
  const reviewed = new Set();
  let historyCount = 0;
  let reviewCount = 0;
  for (let day = 30; day >= 4; day -= 1) {
    const ordersToday = 1 + Math.floor(random() * 2);
    for (let n = 0; n < ordersToday; n += 1) {
      const customer = pick(sampleCustomers);
      const lines = new Map();
      for (let k = 1 + Math.floor(random() * 3); k > 0; k -= 1) lines.set(pick(sellable).sku, 1 + Math.floor(random() * 2));
      const items = [...lines];
      const subtotal = items.reduce((sum, [sku, qty]) => sum + products[sku].price * qty, 0);
      const cancelled = random() < 0.12;
      const status = cancelled ? 'da_huy' : 'da_giao';
      const express = random() < 0.3;
      const fee = express ? 50000 : 30000;
      let couponCode = null;
      let discount = 0;
      if (random() < 0.25 && subtotal >= couponByCode.KHANG10.minOrder) {
        couponCode = 'KHANG10';
        discount = Math.min(Math.floor(subtotal * 0.1), couponByCode.KHANG10.maxDiscount);
      }
      const minutesAgo = day * 24 * 60 - Math.floor(random() * 600);
      const [r] = await conn.query(
        `INSERT INTO orders (code, user_id, customer_name, phone, province, ward, address_detail, shipping_method,
           shipping_fee, payment_method, subtotal, coupon_code, discount, total, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'Số nhà mẫu, đường mẫu', ?, ?, ?, ?, ?, ?, ?, ?, NOW() - INTERVAL ? MINUTE)`,
        [
          `H${day}-${n}`, customer.id, customer.fullName, customer.phone, customer.province, customer.ward,
          express ? 'express' : 'standard', fee, random() < 0.6 ? 'cod' : 'bank', subtotal, couponCode, discount,
          subtotal - discount + fee, status, minutesAgo,
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
      const steps = cancelled ? ['cho_xac_nhan', 'da_huy'] : FLOW;
      for (const [i, step] of steps.entries()) {
        await conn.query(
          'INSERT INTO order_status_history (order_id, status, created_at) VALUES (?, ?, NOW() - INTERVAL ? MINUTE)',
          [orderId, step, Math.max(minutesAgo - i * 600, 0)],
        );
      }
      if (couponCode && !cancelled) await conn.query('UPDATE coupons SET used_count = used_count + 1 WHERE code = ?', [couponCode]);
      historyCount += 1;

      // Khoảng hai phần ba số sản phẩm đã nhận được khách đánh giá sau khi nhận hàng 1-2 ngày
      if (cancelled) continue;
      for (const [sku] of items) {
        const key = `${customer.id}:${sku}`;
        if (reviewed.has(key) || random() > 0.65) continue;
        reviewed.add(key);
        const roll = random();
        const rating = roll < 0.55 ? 5 : roll < 0.88 ? 4 : 3;
        await conn.query(
          `INSERT INTO reviews (product_id, user_id, rating, comment, created_at)
           VALUES (?, ?, ?, ?, NOW() - INTERVAL ? MINUTE)`,
          [products[sku].id, customer.id, rating, pick(COMMENTS[rating]), Math.max(minutesAgo - 2 * 24 * 60, 60)],
        );
        reviewCount += 1;
      }
    }
  }

  console.log(`Đã tạo CSDL "${database}": ${CATEGORIES.length} danh mục, ${PRODUCTS.length} sản phẩm, ${ORDERS.length} đơn hàng mẫu.`);
  console.log(`Dữ liệu lịch sử: ${sampleCustomers.length} khách hàng mẫu, ${historyCount} đơn trong 30 ngày, ${reviewCount} đánh giá, ${COUPONS.length} mã giảm giá.`);
  console.log('Tài khoản thử nghiệm: xem mục "Tài khoản dùng thử" trong README.md');
  await conn.end();
}

main().catch((err) => {
  console.error('Không khởi tạo được CSDL:', err.message);
  if (err.code === 'ER_ACCESS_DENIED_ERROR') console.error('Kiểm tra DB_USER và DB_PASSWORD trong server/.env');
  process.exit(1);
});
