import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError, toInt } from '../utils.js';

// Giỏ hàng của tài khoản đang đăng nhập (lưu trong bảng cart_items)
const router = Router();
router.use(requireAuth);

const MAX_QTY = 99;

// Trả về giỏ hàng với giá, tồn kho mới nhất; tự bỏ sản phẩm đã ngừng bán hoặc hết hàng
// và giảm số lượng vượt tồn kho. changed = true để giao diện báo cho khách biết.
async function readCart(userId) {
  const [rows] = await pool.query(
    `SELECT ci.product_id, ci.quantity, p.slug, p.name, p.price, p.old_price, p.stock, p.image_url, p.is_visible,
       c.name AS category_name
     FROM cart_items ci JOIN products p ON p.id = ci.product_id JOIN categories c ON c.id = p.category_id
     WHERE ci.user_id = ? ORDER BY ci.added_at, ci.product_id`,
    [userId],
  );
  let changed = false;
  const items = [];
  for (const r of rows) {
    if (!r.is_visible || r.stock === 0) {
      await pool.query('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?', [userId, r.product_id]);
      changed = true;
      continue;
    }
    const quantity = Math.min(r.quantity, r.stock, MAX_QTY);
    if (quantity !== r.quantity) {
      await pool.query('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?', [quantity, userId, r.product_id]);
      changed = true;
    }
    items.push({
      productId: r.product_id, slug: r.slug, name: r.name, price: r.price, oldPrice: r.old_price, stock: r.stock,
      imageUrl: r.image_url, category: r.category_name, quantity,
    });
  }
  return { items, changed };
}

async function sellableProduct(productId) {
  const [[p]] = productId ? await pool.query('SELECT id, name, stock, is_visible FROM products WHERE id = ?', [productId]) : [[]];
  if (!p || !p.is_visible) throw new HttpError(404, 'Sản phẩm không tồn tại hoặc đã ngừng bán');
  if (p.stock === 0) throw new HttpError(409, `"${p.name}" đã hết hàng`);
  return p;
}

router.get('/', async (req, res) => {
  res.json(await readCart(req.user.id));
});

// Thêm vào giỏ: cộng dồn số lượng, không vượt tồn kho
router.post('/items', async (req, res) => {
  const productId = toInt(req.body.productId, { min: 1 });
  const quantity = toInt(req.body.quantity ?? 1, { min: 1, max: MAX_QTY });
  if (quantity === null) throw new HttpError(400, 'Số lượng không hợp lệ');
  const p = await sellableProduct(productId);
  const limit = Math.min(p.stock, MAX_QTY);
  await pool.query(
    `INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE quantity = LEAST(quantity + VALUES(quantity), ?)`,
    [req.user.id, p.id, Math.min(quantity, limit), limit],
  );
  res.json(await readCart(req.user.id));
});

// Đổi số lượng một sản phẩm trong giỏ
router.put('/items/:productId', async (req, res) => {
  const productId = toInt(req.params.productId, { min: 1 });
  const quantity = toInt(req.body.quantity, { min: 1, max: MAX_QTY });
  if (quantity === null) throw new HttpError(400, 'Số lượng không hợp lệ');
  const p = await sellableProduct(productId);
  const [result] = await pool.query('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?', [
    Math.min(quantity, p.stock), req.user.id, p.id,
  ]);
  if (!result.affectedRows) throw new HttpError(404, 'Sản phẩm không có trong giỏ hàng');
  res.json(await readCart(req.user.id));
});

router.delete('/items/:productId', async (req, res) => {
  await pool.query('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?', [req.user.id, toInt(req.params.productId, { min: 1 })]);
  res.json(await readCart(req.user.id));
});

export default router;
