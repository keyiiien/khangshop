import { Router } from 'express';
import { pool } from '../db.js';
import { HttpError } from '../utils.js';

// Gắn trong routes/admin.js (đã kiểm tra quyền quản trị)
const router = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 366;

function parseDay(value) {
  if (!DATE_RE.test(value ?? '')) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

const iso = (date) => date.toISOString().slice(0, 10);

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

// Thống kê doanh thu theo khoảng thời gian (tính theo ngày đặt hàng).
// Doanh thu = tổng tiền các đơn đã giao; giá trị đơn = tổng tiền các đơn không bị hủy.
router.get('/reports/revenue', async (req, res) => {
  const [[{ today }]] = await pool.query("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today");
  if ((req.query.from && !parseDay(req.query.from)) || (req.query.to && !parseDay(req.query.to))) {
    throw new HttpError(400, 'Ngày không hợp lệ, cần dạng năm-tháng-ngày (ví dụ 2026-10-01)');
  }
  const toDate = parseDay(req.query.to) ?? parseDay(today);
  const fromDate = parseDay(req.query.from) ?? addDays(toDate, -29);
  if (fromDate > toDate) throw new HttpError(400, 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc');
  const days = Math.round((toDate - fromDate) / 86_400_000) + 1;
  if (days > MAX_DAYS) throw new HttpError(400, `Khoảng thời gian tối đa ${MAX_DAYS} ngày`);

  const from = iso(fromDate);
  const to = iso(toDate);
  const range = [from, to];
  const IN_RANGE = 'o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)';

  const [[sum]] = await pool.query(
    `SELECT COUNT(*) AS orders,
       COALESCE(SUM(o.status = 'da_giao'), 0) AS delivered,
       COALESCE(SUM(o.status = 'da_huy'), 0) AS cancelled,
       COALESCE(SUM(CASE WHEN o.status = 'da_giao' THEN o.total END), 0) AS revenue,
       COALESCE(SUM(CASE WHEN o.status <> 'da_huy' THEN o.total END), 0) AS order_value,
       COALESCE(SUM(CASE WHEN o.status <> 'da_huy' THEN o.discount END), 0) AS discount
     FROM orders o WHERE ${IN_RANGE}`,
    range,
  );
  const valid = Number(sum.orders) - Number(sum.cancelled);

  // Khoảng dài thì gộp theo tháng để biểu đồ không quá nhiều cột
  const groupBy = days > 62 ? 'month' : 'day';
  const format = groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(o.created_at, ?) AS period,
       COALESCE(SUM(o.status <> 'da_huy'), 0) AS orders,
       COALESCE(SUM(CASE WHEN o.status = 'da_giao' THEN o.total END), 0) AS revenue,
       COALESCE(SUM(CASE WHEN o.status <> 'da_huy' THEN o.total END), 0) AS order_value
     FROM orders o WHERE ${IN_RANGE} GROUP BY period`,
    [format, ...range],
  );
  const byPeriod = new Map(rows.map((r) => [r.period, r]));
  const periods = [];
  if (groupBy === 'day') {
    for (let d = fromDate; d <= toDate; d = addDays(d, 1)) periods.push(iso(d));
  } else {
    for (let d = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), 1)); d <= toDate;
      d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
      periods.push(iso(d).slice(0, 7));
    }
  }
  const series = periods.map((period) => {
    const r = byPeriod.get(period);
    return { period, orders: Number(r?.orders ?? 0), revenue: Number(r?.revenue ?? 0), orderValue: Number(r?.order_value ?? 0) };
  });

  const [top] = await pool.query(
    `SELECT oi.product_name AS name, p.sku, p.image_url, SUM(oi.quantity) AS quantity,
       SUM(oi.quantity * oi.unit_price) AS amount
     FROM order_items oi JOIN orders o ON o.id = oi.order_id LEFT JOIN products p ON p.id = oi.product_id
     WHERE ${IN_RANGE} AND o.status <> 'da_huy'
     GROUP BY oi.product_id, oi.product_name, p.sku, p.image_url
     ORDER BY amount DESC, quantity DESC LIMIT 10`,
    range,
  );
  const [categories] = await pool.query(
    `SELECT COALESCE(c.name, 'Sản phẩm đã xóa') AS name, SUM(oi.quantity) AS quantity,
       SUM(oi.quantity * oi.unit_price) AS amount
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
       LEFT JOIN products p ON p.id = oi.product_id LEFT JOIN categories c ON c.id = p.category_id
     WHERE ${IN_RANGE} AND o.status <> 'da_huy'
     GROUP BY c.id, c.name ORDER BY amount DESC`,
    range,
  );

  res.json({
    from,
    to,
    days,
    groupBy,
    summary: {
      orders: Number(sum.orders),
      delivered: Number(sum.delivered),
      cancelled: Number(sum.cancelled),
      revenue: Number(sum.revenue),
      orderValue: Number(sum.order_value),
      discount: Number(sum.discount),
      averageOrder: valid ? Math.round(Number(sum.order_value) / valid) : 0,
    },
    series,
    topProducts: top.map((t) => ({
      name: t.name, sku: t.sku, imageUrl: t.image_url, quantity: Number(t.quantity), amount: Number(t.amount),
    })),
    byCategory: categories.map((c) => ({ name: c.name, quantity: Number(c.quantity), amount: Number(c.amount) })),
  });
});

export default router;
