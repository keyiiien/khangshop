import { pool, withTransaction } from '../db.js';
import { HttpError, NEXT_STATUS, SHIPPING_METHODS, STATUS_LABEL } from '../utils.js';
import { couponDiscount, findUsableCoupon } from './coupons.js';

export function toOrderSummary(row) {
  return {
    code: row.code,
    customerName: row.customer_name,
    phone: row.phone,
    total: row.total,
    paymentMethod: row.payment_method,
    status: row.status,
    itemCount: Number(row.item_count ?? 0),
    createdAt: row.created_at,
  };
}

export async function findOrderByCode(code) {
  const [[order]] = await pool.query('SELECT * FROM orders WHERE code = ?', [code]);
  if (!order) return null;
  const [items] = await pool.query(
    `SELECT oi.product_id, oi.product_name, oi.unit_price, oi.quantity, p.slug, p.image_url
     FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ? ORDER BY oi.id`,
    [order.id],
  );
  const [history] = await pool.query(
    'SELECT status, created_at FROM order_status_history WHERE order_id = ? ORDER BY created_at, id',
    [order.id],
  );
  return {
    code: order.code,
    userId: order.user_id,
    status: order.status,
    customerName: order.customer_name,
    phone: order.phone,
    email: order.email,
    province: order.province,
    ward: order.ward,
    addressDetail: order.address_detail,
    note: order.note,
    shippingMethod: order.shipping_method,
    shippingFee: order.shipping_fee,
    paymentMethod: order.payment_method,
    subtotal: order.subtotal,
    couponCode: order.coupon_code,
    discount: order.discount,
    total: order.total,
    createdAt: order.created_at,
    items: items.map((it) => ({
      productId: it.product_id,
      name: it.product_name,
      slug: it.slug,
      imageUrl: it.image_url,
      unitPrice: it.unit_price,
      quantity: it.quantity,
      lineTotal: it.unit_price * it.quantity,
    })),
    history: history.map((h) => ({ status: h.status, at: h.created_at })),
  };
}

// Tiền hàng của giỏ theo giá hiện tại trong CSDL (dùng khi khách bấm "Áp dụng" mã giảm giá)
export async function cartSubtotal(items) {
  const [products] = await pool.query('SELECT id, price FROM products WHERE id IN (?) AND is_visible = 1', [
    items.map((it) => it.productId),
  ]);
  const price = new Map(products.map((p) => [p.id, p.price]));
  return items.reduce((sum, it) => sum + (price.get(it.productId) ?? 0) * it.quantity, 0);
}

// Tạo đơn: khóa các dòng sản phẩm, kiểm tra tồn kho, tính tiền ở phía server rồi trừ kho.
// Có mã giảm giá thì khóa dòng mã, kiểm tra lại điều kiện và ghi nhận một lượt dùng trong cùng transaction.
export async function createOrder({ customer, shippingMethod, paymentMethod, items, userId, couponCode }) {
  return withTransaction(async (conn) => {
    const ids = items.map((it) => it.productId);
    const [products] = await conn.query(
      'SELECT id, name, price, stock, is_visible FROM products WHERE id IN (?) FOR UPDATE',
      [ids],
    );
    const byId = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const lines = items.map(({ productId, quantity }) => {
      const p = byId.get(productId);
      if (!p || !p.is_visible) throw new HttpError(409, 'Có sản phẩm trong giỏ đã ngừng bán, vui lòng cập nhật giỏ hàng');
      if (p.stock < quantity) {
        throw new HttpError(409, p.stock === 0 ? `"${p.name}" đã hết hàng` : `"${p.name}" chỉ còn ${p.stock} sản phẩm`);
      }
      subtotal += p.price * quantity;
      return [p, quantity];
    });

    const shippingFee = SHIPPING_METHODS[shippingMethod].fee;
    let discount = 0;
    let coupon = null;
    if (couponCode) {
      coupon = await findUsableCoupon(conn, couponCode, subtotal, { forUpdate: true });
      discount = couponDiscount(coupon, subtotal);
      await conn.query('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [coupon.id]);
    }
    const total = subtotal - discount + shippingFee;
    const tempCode = `T${Date.now()}${Math.floor(Math.random() * 1e4)}`;
    const [result] = await conn.query(
      `INSERT INTO orders (code, user_id, customer_name, phone, email, province, ward, address_detail, note,
         shipping_method, shipping_fee, payment_method, subtotal, coupon_code, discount, total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tempCode, userId ?? null, customer.fullName, customer.phone, customer.email || null, customer.province,
        customer.ward, customer.address, customer.note || null, shippingMethod, shippingFee, paymentMethod,
        subtotal, coupon?.code ?? null, discount, total,
      ],
    );
    const orderId = result.insertId;

    // Mã đơn dạng DH + yymmdd + số thứ tự, ví dụ DH261007-0012
    await conn.query(
      "UPDATE orders SET code = CONCAT('DH', DATE_FORMAT(created_at, '%y%m%d'), '-', LPAD(id, 4, '0')) WHERE id = ?",
      [orderId],
    );
    await conn.query(
      'INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity) VALUES ?',
      [lines.map(([p, qty]) => [orderId, p.id, p.name, p.price, qty])],
    );
    for (const [p, qty] of lines) {
      await conn.query('UPDATE products SET stock = stock - ? WHERE id = ?', [qty, p.id]);
    }
    await conn.query('INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, ?, ?)', [
      orderId, 'cho_xac_nhan', userId ?? null,
    ]);
    const [[{ code }]] = await conn.query('SELECT code FROM orders WHERE id = ?', [orderId]);
    return { code, total, discount };
  });
}

// Đổi trạng thái đơn. Khách chỉ được hủy khi đơn còn "Chờ xác nhận";
// quản trị viên được hủy trước khi giao. Hủy đơn sẽ hoàn lại tồn kho và lượt dùng mã giảm giá.
export async function changeOrderStatus(code, nextStatus, { actorId = null, customerPhone = null } = {}) {
  return withTransaction(async (conn) => {
    const [[order]] = await conn.query('SELECT id, status, phone, coupon_code FROM orders WHERE code = ? FOR UPDATE', [code]);
    if (!order || (customerPhone !== null && order.phone !== customerPhone)) {
      throw new HttpError(404, 'Không tìm thấy đơn hàng');
    }
    const cancellable = customerPhone !== null ? ['cho_xac_nhan'] : ['cho_xac_nhan', 'da_xac_nhan'];
    const allowed = nextStatus === 'da_huy' ? cancellable.includes(order.status) : NEXT_STATUS[order.status] === nextStatus;
    if (!allowed) {
      throw new HttpError(409, `Không thể chuyển đơn từ "${STATUS_LABEL[order.status]}" sang "${STATUS_LABEL[nextStatus]}"`);
    }
    await conn.query('UPDATE orders SET status = ? WHERE id = ?', [nextStatus, order.id]);
    if (nextStatus === 'da_huy') {
      await conn.query(
        'UPDATE products p JOIN order_items oi ON oi.product_id = p.id SET p.stock = p.stock + oi.quantity WHERE oi.order_id = ?',
        [order.id],
      );
      if (order.coupon_code) {   // trả lại lượt dùng mã giảm giá
        await conn.query('UPDATE coupons SET used_count = used_count - 1 WHERE code = ? AND used_count > 0', [order.coupon_code]);
      }
    }
    await conn.query('INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, ?, ?)', [
      order.id, nextStatus, actorId,
    ]);
  });
}
