import { Router } from 'express';
import { pool } from '../db.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { HttpError, pagination, text, toInt } from '../utils.js';

// Gắn tại /api/products/:slug/reviews
const router = Router({ mergeParams: true });

async function findProduct(slug) {
  const [[product]] = await pool.query('SELECT id, name FROM products WHERE slug = ? AND is_visible = 1', [slug]);
  if (!product) throw new HttpError(404, 'Sản phẩm không tồn tại hoặc đã ngừng bán');
  return product;
}

// Chỉ khách có đơn đã giao chứa sản phẩm mới được đánh giá
async function hasPurchased(userId, productId) {
  const [[row]] = await pool.query(
    `SELECT 1 AS ok FROM orders o JOIN order_items oi ON oi.order_id = o.id
     WHERE o.user_id = ? AND o.status = 'da_giao' AND oi.product_id = ? LIMIT 1`,
    [userId, productId],
  );
  return Boolean(row);
}

// Ẩn bớt tên đệm khi hiển thị công khai: "Nguyễn Văn An" -> "Nguyễn V. An"
function publicName(fullName) {
  const words = String(fullName).trim().split(/\s+/);
  if (words.length <= 2) return words.join(' ');
  return [words[0], ...words.slice(1, -1).map((w) => `${w[0]}.`), words.at(-1)].join(' ');
}

function toReview(row, userId) {
  return {
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    author: publicName(row.full_name),
    createdAt: row.created_at,
    mine: row.user_id === userId,
  };
}

router.get('/', optionalAuth, async (req, res) => {
  const product = await findProduct(req.params.slug);
  const { limit, page, offset } = pagination(req.query, 5);
  const userId = req.user?.id ?? 0;

  const [stats] = await pool.query('SELECT rating, COUNT(*) AS count FROM reviews WHERE product_id = ? GROUP BY rating', [product.id]);
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const s of stats) distribution[s.rating] = s.count;
  const count = stats.reduce((sum, s) => sum + s.count, 0);
  const average = count ? Math.round((stats.reduce((sum, s) => sum + s.rating * s.count, 0) / count) * 10) / 10 : null;

  // Đánh giá của chính mình luôn nằm đầu danh sách
  const [rows] = await pool.query(
    `SELECT r.*, u.full_name FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.product_id = ? ORDER BY (r.user_id = ?) DESC, r.created_at DESC, r.id DESC LIMIT ? OFFSET ?`,
    [product.id, userId, limit, offset],
  );

  let mine = null;
  let canReview = false;
  let reason = 'login';
  if (req.user) {
    const [[own]] = await pool.query(
      'SELECT r.*, u.full_name FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.product_id = ? AND r.user_id = ?',
      [product.id, userId],
    );
    mine = own ? toReview(own, userId) : null;
    canReview = await hasPurchased(userId, product.id);
    reason = canReview ? null : 'not_purchased';
  }
  res.json({
    summary: { average, count, distribution },
    items: rows.map((r) => toReview(r, userId)),
    page,
    pages: Math.max(1, Math.ceil(count / limit)),
    canReview,
    reason,
    mine,
  });
});

// Gửi hoặc sửa đánh giá của mình (mỗi khách một đánh giá cho một sản phẩm)
router.post('/', requireAuth, async (req, res) => {
  const product = await findProduct(req.params.slug);
  const rating = toInt(req.body.rating, { min: 1, max: 5 });
  const comment = text(req.body.comment, 1000) || null;
  if (rating === null) throw new HttpError(400, 'Vui lòng chọn số sao từ 1 đến 5');
  if (!(await hasPurchased(req.user.id, product.id))) {
    throw new HttpError(403, 'Chỉ khách đã nhận hàng thành công mới đánh giá được sản phẩm này');
  }
  const [result] = await pool.query(
    `INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)`,
    [product.id, req.user.id, rating, comment],
  );
  const [[row]] = await pool.query(
    'SELECT r.*, u.full_name FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.product_id = ? AND r.user_id = ?',
    [product.id, req.user.id],
  );
  res.status(result.affectedRows === 1 ? 201 : 200).json(toReview(row, req.user.id));
});

router.delete('/mine', requireAuth, async (req, res) => {
  const product = await findProduct(req.params.slug);
  const [result] = await pool.query('DELETE FROM reviews WHERE product_id = ? AND user_id = ?', [product.id, req.user.id]);
  if (!result.affectedRows) throw new HttpError(404, 'Bạn chưa đánh giá sản phẩm này');
  res.status(204).end();
});

export default router;
