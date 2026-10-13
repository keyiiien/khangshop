import { Router } from 'express';
import { pool } from '../db.js';
import { normalizeCouponCode, toCoupon } from '../services/coupons.js';
import { HttpError, escapeLike, pagination, text, toInt } from '../utils.js';

// Gắn trong routes/admin.js (đã kiểm tra quyền quản trị): mã giảm giá và kiểm duyệt đánh giá
const router = Router();

// ---------- Mã giảm giá ----------

const COUPON_SELECT = `
  SELECT c.*, DATE_FORMAT(c.starts_at, '%Y-%m-%d') AS starts_on, DATE_FORMAT(c.expires_at, '%Y-%m-%d') AS expires_on,
    (c.starts_at IS NOT NULL AND c.starts_at > NOW()) AS not_started,
    (c.expires_at IS NOT NULL AND c.expires_at < NOW()) AS expired
  FROM coupons c`;

// Trạng thái hiển thị cho quản trị viên
function couponState(row) {
  if (!row.is_active) return 'tat';
  if (row.expired) return 'het_han';
  if (row.not_started) return 'chua_bat_dau';
  if (row.usage_limit !== null && row.used_count >= row.usage_limit) return 'het_luot';
  return 'dang_chay';
}

const toAdminCoupon = (row) => ({ ...toCoupon(row), startsOn: row.starts_on, expiresOn: row.expires_on, state: couponState(row) });

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function readCouponInput(body) {
  const input = {
    code: normalizeCouponCode(body.code),
    description: text(body.description, 255) || null,
    type: body.type,
    value: toInt(body.value, { min: 1 }),
    maxDiscount: toInt(body.maxDiscount, { min: 0 }),
    minOrder: toInt(body.minOrder, { min: 0 }) ?? 0,
    usageLimit: toInt(body.usageLimit, { min: 0 }),
    startsOn: text(body.startsOn, 10) || null,
    expiresOn: text(body.expiresOn, 10) || null,
    isActive: body.isActive !== false && body.isActive !== 'false',
  };
  if (!/^[A-Z0-9]{3,30}$/.test(input.code)) throw new HttpError(400, 'Mã gồm 3–30 ký tự chữ không dấu hoặc số, viết liền');
  if (!['percent', 'fixed'].includes(input.type)) throw new HttpError(400, 'Vui lòng chọn loại giảm giá');
  if (input.value === null) throw new HttpError(400, 'Mức giảm phải là số nguyên dương');
  if (input.type === 'percent' && input.value > 100) throw new HttpError(400, 'Mức giảm theo phần trăm từ 1 đến 100');
  if (input.type === 'fixed' && input.value < 1000) throw new HttpError(400, 'Mức giảm cố định từ 1.000₫');
  if (input.type === 'fixed' || !input.maxDiscount) input.maxDiscount = null;
  if (!input.usageLimit) input.usageLimit = null;
  for (const day of [input.startsOn, input.expiresOn]) {
    if (day && (!DATE_RE.test(day) || Number.isNaN(Date.parse(`${day}T00:00:00Z`)))) throw new HttpError(400, 'Ngày không hợp lệ');
  }
  if (input.startsOn && input.expiresOn && input.startsOn > input.expiresOn) {
    throw new HttpError(400, 'Ngày hết hạn phải sau hoặc bằng ngày bắt đầu');
  }
  return input;
}

// Ngày bắt đầu tính từ 00:00, ngày hết hạn tính đến hết 23:59:59
const couponParams = (c) => [
  c.code, c.description, c.type, c.value, c.maxDiscount, c.minOrder, c.usageLimit,
  c.startsOn ? `${c.startsOn} 00:00:00` : null, c.expiresOn ? `${c.expiresOn} 23:59:59` : null, c.isActive,
];

async function getCoupon(id) {
  const [[row]] = await pool.query(`${COUPON_SELECT} WHERE c.id = ?`, [id]);
  return row ? toAdminCoupon(row) : null;
}

router.get('/coupons', async (req, res) => {
  const [rows] = await pool.query(`${COUPON_SELECT} ORDER BY c.created_at DESC, c.id DESC`);
  res.json(rows.map(toAdminCoupon));
});

router.post('/coupons', async (req, res) => {
  const input = readCouponInput(req.body);
  const [[dup]] = await pool.query('SELECT id FROM coupons WHERE code = ?', [input.code]);
  if (dup) throw new HttpError(409, `Mã ${input.code} đã tồn tại`);
  const [result] = await pool.query(
    `INSERT INTO coupons (code, description, type, value, max_discount, min_order, usage_limit, starts_at, expires_at, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    couponParams(input),
  );
  res.status(201).json(await getCoupon(result.insertId));
});

router.put('/coupons/:id', async (req, res) => {
  const id = toInt(req.params.id, { min: 1 });
  const input = readCouponInput(req.body);
  const [[dup]] = await pool.query('SELECT id FROM coupons WHERE code = ? AND id <> ?', [input.code, id]);
  if (dup) throw new HttpError(409, `Mã ${input.code} đã tồn tại`);
  const [result] = await pool.query(
    `UPDATE coupons SET code = ?, description = ?, type = ?, value = ?, max_discount = ?, min_order = ?, usage_limit = ?,
       starts_at = ?, expires_at = ?, is_active = ? WHERE id = ?`,
    [...couponParams(input), id],
  );
  if (!result.affectedRows) throw new HttpError(404, 'Không tìm thấy mã giảm giá');
  res.json(await getCoupon(id));
});

router.patch('/coupons/:id/active', async (req, res) => {
  const id = toInt(req.params.id, { min: 1 });
  const [result] = await pool.query('UPDATE coupons SET is_active = ? WHERE id = ?', [Boolean(req.body.isActive), id]);
  if (!result.affectedRows) throw new HttpError(404, 'Không tìm thấy mã giảm giá');
  res.json(await getCoupon(id));
});

// Đơn hàng cũ vẫn giữ mã và số tiền đã giảm vì bảng orders lưu lại hai giá trị này
router.delete('/coupons/:id', async (req, res) => {
  const [result] = await pool.query('DELETE FROM coupons WHERE id = ?', [toInt(req.params.id, { min: 1 })]);
  if (!result.affectedRows) throw new HttpError(404, 'Không tìm thấy mã giảm giá');
  res.status(204).end();
});

// ---------- Đánh giá sản phẩm ----------

router.get('/reviews', async (req, res) => {
  const { limit, page, offset } = pagination(req.query, 20);
  const where = ['1 = 1'];
  const params = [];
  const rating = toInt(req.query.rating, { min: 1, max: 5 });
  if (rating) {
    where.push('r.rating = ?');
    params.push(rating);
  }
  const q = text(req.query.q, 100);
  if (q) {
    where.push('(p.name LIKE ? OR u.full_name LIKE ? OR r.comment LIKE ?)');
    params.push(...Array(3).fill(`%${escapeLike(q)}%`));
  }
  const whereSql = where.join(' AND ');
  const FROM = 'FROM reviews r JOIN products p ON p.id = r.product_id JOIN users u ON u.id = r.user_id';
  const [rows] = await pool.query(
    `SELECT r.*, p.name AS product_name, p.slug, p.image_url, u.full_name, u.email
     ${FROM} WHERE ${whereSql} ORDER BY r.created_at DESC, r.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${FROM} WHERE ${whereSql}`, params);
  res.json({
    items: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
      product: { id: r.product_id, name: r.product_name, slug: r.slug, imageUrl: r.image_url },
      user: { fullName: r.full_name, email: r.email },
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

router.delete('/reviews/:id', async (req, res) => {
  const [result] = await pool.query('DELETE FROM reviews WHERE id = ?', [toInt(req.params.id, { min: 1 })]);
  if (!result.affectedRows) throw new HttpError(404, 'Không tìm thấy đánh giá');
  res.status(204).end();
});

export default router;
