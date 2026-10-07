import { Router } from 'express';
import { pool } from '../db.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { changeOrderStatus, createOrder, findOrderByCode, toOrderSummary } from '../services/orders.js';
import {
  EMAIL_RE, HttpError, PAYMENT_METHODS, PHONE_RE, SHIPPING_METHODS, normalizePhone, text, toInt,
} from '../utils.js';

const router = Router();

function readCustomer(body = {}) {
  const customer = {
    fullName: text(body.fullName, 100),
    phone: normalizePhone(body.phone),
    email: text(body.email, 150).toLowerCase(),
    province: text(body.province, 100),
    ward: text(body.ward, 100),
    address: text(body.address, 255),
    note: text(body.note, 500),
  };
  if (!customer.fullName) throw new HttpError(400, 'Vui lòng nhập họ tên người nhận');
  if (!PHONE_RE.test(customer.phone)) throw new HttpError(400, 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0');
  if (customer.email && !EMAIL_RE.test(customer.email)) throw new HttpError(400, 'Email không hợp lệ');
  if (!customer.province || !customer.ward || !customer.address) throw new HttpError(400, 'Vui lòng nhập đầy đủ địa chỉ nhận hàng');
  return customer;
}

// Gộp các dòng trùng sản phẩm và kiểm tra số lượng
function readItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, 'Giỏ hàng đang trống');
  const merged = new Map();
  for (const it of items) {
    const productId = toInt(it?.productId, { min: 1 });
    const quantity = toInt(it?.quantity, { min: 1, max: 99 });
    if (productId === null || quantity === null) throw new HttpError(400, 'Số lượng sản phẩm không hợp lệ');
    merged.set(productId, (merged.get(productId) ?? 0) + quantity);
  }
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
}

router.post('/', optionalAuth, async (req, res) => {
  const { shippingMethod, paymentMethod } = req.body;
  if (!SHIPPING_METHODS[shippingMethod]) throw new HttpError(400, 'Phương thức giao hàng không hợp lệ');
  if (!PAYMENT_METHODS.includes(paymentMethod)) throw new HttpError(400, 'Phương thức thanh toán không hợp lệ');
  const result = await createOrder({
    customer: readCustomer(req.body.customer),
    items: readItems(req.body.items),
    shippingMethod,
    paymentMethod,
    userId: req.user?.id,
  });
  res.status(201).json(result);
});

// Tra cứu đơn cho khách (không cần đăng nhập): cần đúng mã đơn và số điện thoại
router.post('/lookup', async (req, res) => {
  const code = text(req.body.code, 20).toUpperCase();
  const phone = normalizePhone(req.body.phone);
  const order = code ? await findOrderByCode(code) : null;
  if (!order || order.phone !== phone) throw new HttpError(404, 'Không tìm thấy đơn hàng với mã và số điện thoại này');
  res.json(order);
});

router.post('/cancel', async (req, res) => {
  const code = text(req.body.code, 20).toUpperCase();
  await changeOrderStatus(code, 'da_huy', { customerPhone: normalizePhone(req.body.phone) });
  res.json(await findOrderByCode(code));
});

router.get('/mine', requireAuth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT o.*, (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) AS item_count
     FROM orders o WHERE o.user_id = ? ORDER BY o.created_at DESC, o.id DESC`,
    [req.user.id],
  );
  res.json(rows.map(toOrderSummary));
});

router.get('/mine/:code', requireAuth, async (req, res) => {
  const order = await findOrderByCode(text(req.params.code, 20).toUpperCase());
  if (!order || order.userId !== req.user.id) throw new HttpError(404, 'Không tìm thấy đơn hàng');
  res.json(order);
});

export default router;
