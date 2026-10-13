import { HttpError } from '../utils.js';

const vnd = (value) => `${Number(value).toLocaleString('vi-VN')}₫`;

export function normalizeCouponCode(value) {
  return String(value ?? '').trim().toUpperCase().slice(0, 30);
}

export function toCoupon(row) {
  return {
    id: row.id,
    code: row.code,
    description: row.description,
    type: row.type,
    value: row.value,
    maxDiscount: row.max_discount,
    minOrder: row.min_order,
    usageLimit: row.usage_limit,
    usedCount: row.used_count,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  };
}

// Số tiền được giảm trên tiền hàng (không giảm vào phí vận chuyển, không vượt quá tiền hàng)
export function couponDiscount(coupon, subtotal) {
  if (coupon.type === 'fixed') return Math.min(coupon.value, subtotal);
  const amount = Math.floor((subtotal * coupon.value) / 100);
  return Math.min(amount, coupon.max_discount ?? amount, subtotal);
}

// Đọc mã và kiểm tra điều kiện áp dụng. Thời gian so sánh ngay trong MySQL để không lệch múi giờ.
// forUpdate = true khi đang đặt hàng: khóa dòng mã để hai đơn không dùng chung lượt cuối cùng.
export async function findUsableCoupon(conn, code, subtotal, { forUpdate = false } = {}) {
  const [[coupon]] = await conn.query(
    `SELECT c.*, (c.starts_at IS NOT NULL AND c.starts_at > NOW()) AS not_started,
       (c.expires_at IS NOT NULL AND c.expires_at < NOW()) AS expired
     FROM coupons c WHERE c.code = ?${forUpdate ? ' FOR UPDATE' : ''}`,
    [normalizeCouponCode(code)],
  );
  if (!coupon || !coupon.is_active) throw new HttpError(404, 'Mã giảm giá không tồn tại');
  if (coupon.not_started) throw new HttpError(409, 'Mã giảm giá chưa đến thời gian áp dụng');
  if (coupon.expired) throw new HttpError(409, 'Mã giảm giá đã hết hạn');
  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
    throw new HttpError(409, 'Mã giảm giá đã hết lượt sử dụng');
  }
  if (subtotal < coupon.min_order) {
    throw new HttpError(409, `Mã ${coupon.code} chỉ áp dụng cho đơn có tiền hàng từ ${vnd(coupon.min_order)}`);
  }
  return coupon;
}
