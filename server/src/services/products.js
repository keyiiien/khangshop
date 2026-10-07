import { pool } from '../db.js';
import { slugify } from '../utils.js';

export const PRODUCT_SELECT = `
  SELECT p.*, c.name AS category_name, c.slug AS category_slug, COALESCE(s.sold, 0) AS sold
  FROM products p
  JOIN categories c ON c.id = p.category_id
  LEFT JOIN (
    SELECT oi.product_id, SUM(oi.quantity) AS sold
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id AND o.status <> 'da_huy'
    GROUP BY oi.product_id
  ) s ON s.product_id = p.id`;

export function toProduct(row) {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: row.price,
    oldPrice: row.old_price,
    stock: row.stock,
    imageUrl: row.image_url,
    isVisible: Boolean(row.is_visible),
    sold: Number(row.sold ?? 0),
    category: { id: row.category_id, name: row.category_name, slug: row.category_slug },
    createdAt: row.created_at,
  };
}

// Tạo slug không trùng, thêm hậu tố -2, -3... khi cần
export async function uniqueSlug(table, name, excludeId = 0) {
  const base = slugify(name) || 'muc';
  for (let i = 1; ; i += 1) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const [rows] = await pool.query(`SELECT id FROM ${table} WHERE slug = ? AND id <> ?`, [slug, excludeId]);
    if (rows.length === 0) return slug;
  }
}
