import { Router } from 'express';
import { pool } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { changeOrderStatus, findOrderByCode, toOrderSummary } from '../services/orders.js';
import { PRODUCT_SELECT, toProduct, uniqueSlug } from '../services/products.js';
import { imageUrlFor, productImageUpload, removeUploadedImage } from '../upload.js';
import { HttpError, LOW_STOCK, ORDER_STATUSES, escapeLike, pagination, text, toInt } from '../utils.js';

const router = Router();
router.use(requireAdmin);

// ---------- Tổng quan ----------

router.get('/stats', async (req, res) => {
  const [[today]] = await pool.query(
    `SELECT COALESCE(SUM(total), 0) AS value, COUNT(*) AS count
     FROM orders WHERE created_at >= CURDATE() AND status <> 'da_huy'`,
  );
  const [statusRows] = await pool.query('SELECT status, COUNT(*) AS count FROM orders GROUP BY status');
  const byStatus = Object.fromEntries(statusRows.map((r) => [r.status, r.count]));
  const [[{ lowStockCount }]] = await pool.query('SELECT COUNT(*) AS lowStockCount FROM products WHERE stock <= ?', [LOW_STOCK]);

  const [[{ todayDate }]] = await pool.query("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS todayDate");
  const [chartRows] = await pool.query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day, SUM(total) AS total
     FROM orders WHERE created_at >= CURDATE() - INTERVAL 6 DAY AND status <> 'da_huy'
     GROUP BY day`,
  );
  const totals = Object.fromEntries(chartRows.map((r) => [r.day, Number(r.total)]));
  const chart = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${todayDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (6 - i));
    const day = d.toISOString().slice(0, 10);
    return { day, total: totals[day] ?? 0 };
  });

  const [recent] = await pool.query(
    `SELECT o.*, (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) AS item_count
     FROM orders o ORDER BY o.created_at DESC, o.id DESC LIMIT 5`,
  );
  const [lowStock] = await pool.query(
    'SELECT id, sku, name, stock, image_url FROM products WHERE stock <= ? ORDER BY stock, name LIMIT 6',
    [LOW_STOCK],
  );

  res.json({
    todayValue: Number(today.value),
    todayCount: today.count,
    pending: byStatus.cho_xac_nhan ?? 0,
    shipping: byStatus.dang_giao ?? 0,
    lowStockCount,
    chart,
    recentOrders: recent.map(toOrderSummary),
    lowStock: lowStock.map((p) => ({ id: p.id, sku: p.sku, name: p.name, stock: p.stock, imageUrl: p.image_url })),
  });
});

// ---------- Đơn hàng ----------

router.get('/orders', async (req, res) => {
  const { limit, page, offset } = pagination(req.query, 20);
  const where = ['1 = 1'];
  const params = [];
  if (ORDER_STATUSES.includes(req.query.status)) {
    where.push('o.status = ?');
    params.push(req.query.status);
  }
  const q = text(req.query.q, 100);
  if (q) {
    where.push('(o.code LIKE ? OR o.customer_name LIKE ? OR o.phone LIKE ?)');
    params.push(...Array(3).fill(`%${escapeLike(q)}%`));
  }
  const whereSql = where.join(' AND ');
  const [rows] = await pool.query(
    `SELECT o.*, (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) AS item_count
     FROM orders o WHERE ${whereSql} ORDER BY o.created_at DESC, o.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM orders o WHERE ${whereSql}`, params);
  const [counts] = await pool.query('SELECT status, COUNT(*) AS count FROM orders GROUP BY status');
  res.json({
    items: rows.map(toOrderSummary),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    counts: Object.fromEntries(counts.map((c) => [c.status, c.count])),
  });
});

router.get('/orders/:code', async (req, res) => {
  const order = await findOrderByCode(text(req.params.code, 20).toUpperCase());
  if (!order) throw new HttpError(404, 'Không tìm thấy đơn hàng');
  res.json(order);
});

router.patch('/orders/:code/status', async (req, res) => {
  const status = req.body.status;
  if (!ORDER_STATUSES.includes(status)) throw new HttpError(400, 'Trạng thái không hợp lệ');
  const code = text(req.params.code, 20).toUpperCase();
  await changeOrderStatus(code, status, { actorId: req.user.id });
  res.json(await findOrderByCode(code));
});

// ---------- Sản phẩm ----------

router.get('/products', async (req, res) => {
  const { limit, page, offset } = pagination(req.query, 20);
  const where = ['1 = 1'];
  const params = [];
  const q = text(req.query.q, 100);
  if (q) {
    where.push('(p.name LIKE ? OR p.sku LIKE ?)');
    params.push(`%${escapeLike(q)}%`, `%${escapeLike(q)}%`);
  }
  const categoryId = toInt(req.query.categoryId, { min: 1 });
  if (categoryId) {
    where.push('p.category_id = ?');
    params.push(categoryId);
  }
  const statusFilter = {
    visible: 'p.is_visible = 1',
    hidden: 'p.is_visible = 0',
    low: `p.stock <= ${LOW_STOCK}`,
    out: 'p.stock = 0',
  }[req.query.status];
  if (statusFilter) where.push(statusFilter);

  const whereSql = where.join(' AND ');
  const [rows] = await pool.query(`${PRODUCT_SELECT} WHERE ${whereSql} ORDER BY p.id DESC LIMIT ? OFFSET ?`, [
    ...params, limit, offset,
  ]);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM products p WHERE ${whereSql}`, params);
  res.json({ items: rows.map(toProduct), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

async function readProductInput(body) {
  const input = {
    name: text(body.name, 200),
    sku: text(body.sku, 30).toUpperCase(),
    categoryId: toInt(body.categoryId, { min: 1 }),
    price: toInt(body.price, { min: 1000 }),
    oldPrice: toInt(body.oldPrice, { min: 0 }),
    stock: toInt(body.stock, { min: 0, max: 1_000_000 }),
    description: text(body.description, 5000),
    isVisible: body.isVisible === 'true' || body.isVisible === true,
  };
  if (!input.name) throw new HttpError(400, 'Vui lòng nhập tên sản phẩm');
  if (!input.categoryId) throw new HttpError(400, 'Vui lòng chọn danh mục');
  if (input.price === null) throw new HttpError(400, 'Giá bán phải là số nguyên từ 1.000₫');
  if (input.stock === null) throw new HttpError(400, 'Tồn kho phải là số nguyên không âm');
  if (input.oldPrice === 0) input.oldPrice = null;
  if (input.oldPrice !== null && input.oldPrice <= input.price) throw new HttpError(400, 'Giá gốc phải lớn hơn giá bán');
  if (input.sku && !/^[A-Z0-9-]+$/.test(input.sku)) throw new HttpError(400, 'Mã sản phẩm chỉ gồm chữ, số và dấu gạch ngang');
  const [[category]] = await pool.query('SELECT id FROM categories WHERE id = ?', [input.categoryId]);
  if (!category) throw new HttpError(400, 'Danh mục không tồn tại');
  return input;
}

async function getAdminProduct(id) {
  const [[row]] = await pool.query(`${PRODUCT_SELECT} WHERE p.id = ?`, [id]);
  return row ? toProduct(row) : null;
}

// Nếu lưu thất bại thì xóa ảnh vừa tải lên để không để lại file rác
async function withUploadedImage(req, fn) {
  try {
    return await fn();
  } catch (err) {
    if (req.file) removeUploadedImage(imageUrlFor(req.file));
    throw err;
  }
}

router.post('/products', productImageUpload, async (req, res) => {
  const product = await withUploadedImage(req, async () => {
    const input = await readProductInput(req.body);
    const slug = await uniqueSlug('products', input.name);
    const [result] = await pool.query(
      `INSERT INTO products (category_id, sku, name, slug, description, price, old_price, stock, image_url, is_visible)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.categoryId, input.sku || `T${Date.now()}`, input.name, slug, input.description || null, input.price,
        input.oldPrice, input.stock, imageUrlFor(req.file), input.isVisible,
      ],
    );
    if (!input.sku) {
      await pool.query("UPDATE products SET sku = CONCAT('SP', LPAD(id, 4, '0')) WHERE id = ?", [result.insertId]);
    }
    return getAdminProduct(result.insertId);
  });
  res.status(201).json(product);
});

router.put('/products/:id', productImageUpload, async (req, res) => {
  const id = toInt(req.params.id, { min: 1 });
  const product = await withUploadedImage(req, async () => {
    const current = id && (await getAdminProduct(id));
    if (!current) throw new HttpError(404, 'Không tìm thấy sản phẩm');
    const input = await readProductInput(req.body);
    const slug = input.name === current.name ? current.slug : await uniqueSlug('products', input.name, id);
    const removeImage = req.body.removeImage === 'true';
    const imageUrl = req.file ? imageUrlFor(req.file) : removeImage ? null : current.imageUrl;
    await pool.query(
      `UPDATE products SET category_id = ?, sku = ?, name = ?, slug = ?, description = ?, price = ?, old_price = ?,
         stock = ?, image_url = ?, is_visible = ? WHERE id = ?`,
      [
        input.categoryId, input.sku || current.sku, input.name, slug, input.description || null, input.price,
        input.oldPrice, input.stock, imageUrl, input.isVisible, id,
      ],
    );
    if (current.imageUrl && current.imageUrl !== imageUrl) removeUploadedImage(current.imageUrl);
    return getAdminProduct(id);
  });
  res.json(product);
});

router.patch('/products/:id/visibility', async (req, res) => {
  const id = toInt(req.params.id, { min: 1 });
  const [result] = await pool.query('UPDATE products SET is_visible = ? WHERE id = ?', [Boolean(req.body.isVisible), id]);
  if (!result.affectedRows) throw new HttpError(404, 'Không tìm thấy sản phẩm');
  res.json(await getAdminProduct(id));
});

router.delete('/products/:id', async (req, res) => {
  const id = toInt(req.params.id, { min: 1 });
  const product = id && (await getAdminProduct(id));
  if (!product) throw new HttpError(404, 'Không tìm thấy sản phẩm');
  await pool.query('DELETE FROM products WHERE id = ?', [id]);
  removeUploadedImage(product.imageUrl);
  res.status(204).end();
});

// ---------- Danh mục ----------

router.get('/categories', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT c.*, COUNT(p.id) AS product_count FROM categories c
     LEFT JOIN products p ON p.category_id = c.id GROUP BY c.id ORDER BY c.sort_order, c.id`,
  );
  res.json(rows.map((c) => ({
    id: c.id, name: c.name, slug: c.slug, description: c.description, sortOrder: c.sort_order, productCount: c.product_count,
  })));
});

function readCategoryInput(body) {
  const input = {
    name: text(body.name, 100),
    description: text(body.description, 255) || null,
    sortOrder: toInt(body.sortOrder, { min: 0, max: 1000 }) ?? 0,
  };
  if (!input.name) throw new HttpError(400, 'Vui lòng nhập tên danh mục');
  return input;
}

router.post('/categories', async (req, res) => {
  const input = readCategoryInput(req.body);
  const slug = await uniqueSlug('categories', input.name);
  const [result] = await pool.query(
    'INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)',
    [input.name, slug, input.description, input.sortOrder],
  );
  res.status(201).json({ id: result.insertId, slug, ...input, productCount: 0 });
});

router.put('/categories/:id', async (req, res) => {
  const id = toInt(req.params.id, { min: 1 });
  const input = readCategoryInput(req.body);
  const slug = await uniqueSlug('categories', input.name, id);
  const [result] = await pool.query(
    'UPDATE categories SET name = ?, slug = ?, description = ?, sort_order = ? WHERE id = ?',
    [input.name, slug, input.description, input.sortOrder, id],
  );
  if (!result.affectedRows) throw new HttpError(404, 'Không tìm thấy danh mục');
  res.json({ id, slug, ...input });
});

router.delete('/categories/:id', async (req, res) => {
  const id = toInt(req.params.id, { min: 1 });
  const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM products WHERE category_id = ?', [id]);
  if (count > 0) throw new HttpError(409, `Danh mục đang có ${count} sản phẩm, hãy chuyển hoặc xóa sản phẩm trước`);
  const [result] = await pool.query('DELETE FROM categories WHERE id = ?', [id]);
  if (!result.affectedRows) throw new HttpError(404, 'Không tìm thấy danh mục');
  res.status(204).end();
});

// ---------- Khách hàng ----------

router.get('/customers', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.full_name, u.email, u.phone, u.created_at, COUNT(o.id) AS order_count,
       COALESCE(SUM(CASE WHEN o.status = 'da_giao' THEN o.total END), 0) AS spent
     FROM users u LEFT JOIN orders o ON o.user_id = u.id
     WHERE u.role = 'customer' GROUP BY u.id ORDER BY u.created_at DESC`,
  );
  res.json(rows.map((u) => ({
    id: u.id, fullName: u.full_name, email: u.email, phone: u.phone, createdAt: u.created_at,
    orderCount: u.order_count, spent: Number(u.spent),
  })));
});

export default router;
