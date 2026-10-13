import { Router } from 'express';
import { pool } from '../db.js';
import { couponDiscount, findUsableCoupon, normalizeCouponCode } from '../services/coupons.js';
import { cartSubtotal } from '../services/orders.js';
import { HttpError } from '../utils.js';
import { readItems } from './orders.js';

const router = Router();

// Khách bấm "Áp dụng" ở trang thanh toán: kiểm tra mã với giỏ hàng hiện tại, chưa ghi nhận lượt dùng.
// Khi đặt hàng, máy chủ kiểm tra lại mã một lần nữa trong transaction.
router.post('/check', async (req, res) => {
  const code = normalizeCouponCode(req.body.code);
  if (!code) throw new HttpError(400, 'Vui lòng nhập mã giảm giá');
  const subtotal = await cartSubtotal(readItems(req.body.items));
  const coupon = await findUsableCoupon(pool, code, subtotal);
  res.json({
    code: coupon.code,
    description: coupon.description,
    subtotal,
    discount: couponDiscount(coupon, subtotal),
  });
});

export default router;
