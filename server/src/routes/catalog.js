import { Router } from 'express';
import { pool } from '../db.js';
import { PRODUCT_SELECT, toProduct } from '../services/products.js';
import { HttpError, escapeLike, pagination, text, toInt } from '../utils.js';

export const categoryRouter = Router();
export const productRouter = Router();

categoryRouter.get('/', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT c.id, c.name, c.slug, c.description, COUNT(p.id) AS product_count
     FROM categories c LEFT JOIN products p ON p.category_id = c.id AND p.is_visible = 1
     GROUP BY c.id ORDER BY c.sort_order, c.id`,
  );
  res.json(rows.map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description, productCount: c.product_count })));
});

const SORTS = {
  popular: 'sold DESC, p.id DESC',
  newest: 'p.created_at DESC, p.id DESC',
  price_asc: 'p.price ASC, p.id DESC',
  price_desc: 'p.price DESC, p.id DESC',
  discount: '(p.old_price - p.price) / p.old_price DESC, p.id DESC',
};

// Danh sách sản phẩm đang bán, hỗ trợ lọc, sắp xếp, phân trang
productRouter.get('/', async (req, res) => {
  const { limit, page, offset } = pagination(req.query);
  const where = ['p.is_visible = 1'];
  const params = [];

  const category = text(req.query.category, 120);
  if (category) {
    where.push('c.slug = ?');
    params.push(category);
  }
  const q = text(req.query.q, 100);
  if (q) {
    where.push('(p.name LIKE ? OR p.sku LIKE ?)');
    params.push(`%${escapeLike(q)}%`, `%${escapeLike(q)}%`);
  }
  const minPrice = toInt(req.query.minPrice);
  if (minPrice !== null) {
    where.push('p.price >= ?');
    params.push(minPrice);
  }
  const maxPrice = toInt(req.query.maxPrice);
  if (maxPrice !== null) {
    where.push('p.price <= ?');
    params.push(maxPrice);
  }
  if (req.query.sale === '1') where.push('p.old_price IS NOT NULL');
  if (req.query.inStock === '1') where.push('p.stock > 0');

  const whereSql = where.join(' AND ');
  const orderBy = SORTS[req.query.sort] ?? SORTS.popular;
  const [rows] = await pool.query(`${PRODUCT_SELECT} WHERE ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, [
    ...params, limit, offset,
  ]);
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM products p JOIN categories c ON c.id = p.category_id WHERE ${whereSql}`,
    params,
  );
  res.json({ items: rows.map(toProduct), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

// Lấy giá và tồn kho mới nhất cho các sản phẩm trong giỏ
productRouter.get('/batch', async (req, res) => {
  const ids = String(req.query.ids ?? '')
    .split(',')
    .map((v) => toInt(v, { min: 1 }))
    .filter((v) => v !== null)
    .slice(0, 100);
  if (ids.length === 0) return res.json([]);
  const [rows] = await pool.query(`${PRODUCT_SELECT} WHERE p.is_visible = 1 AND p.id IN (?)`, [ids]);
  res.json(rows.map(toProduct));
});

productRouter.get('/:slug', async (req, res) => {
  const [[row]] = await pool.query(`${PRODUCT_SELECT} WHERE p.slug = ? AND p.is_visible = 1`, [req.params.slug]);
  if (!row) throw new HttpError(404, 'Sản phẩm không tồn tại hoặc đã ngừng bán');
  const [related] = await pool.query(
    `${PRODUCT_SELECT} WHERE p.category_id = ? AND p.id <> ? AND p.is_visible = 1 ORDER BY sold DESC, p.id DESC LIMIT 4`,
    [row.category_id, row.id],
  );
  res.json({ product: toProduct(row), related: related.map(toProduct) });
});
