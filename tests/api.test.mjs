// Kiểm thử API. Chạy trên CSDL mẫu vừa tạo lại (cd server && npm run db:reset), server đang chạy:
//   node api.test.mjs
const BASE = (process.env.SITE ?? 'http://localhost:4000') + '/api';
let pass = 0;
let fail = 0;

async function call(path, { method = 'GET', body, token, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, { method, headers, body: payload });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { status: res.status, data };
}

function check(name, cond, extra = '') {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  ' + extra}`);
}

const health = await call('/health');
check('health', health.status === 200);

const cats = await call('/categories');
check('categories 8', cats.data.length === 8, JSON.stringify(cats.data?.map((c) => c.slug)));

const all = await call('/products?limit=100');
check('visible products = 95 (1 hidden)', all.data.total === 95, all.data.total);

const dien = await call('/products?category=dien-tu&sort=price_asc');
check('category filter dien-tu', dien.data.items.every((p) => p.category.slug === 'dien-tu') && dien.data.total === 12, dien.data.total);
check('sort price_asc', dien.data.items.every((p, i, a) => i === 0 || a[i - 1].price <= p.price));

const sale = await call('/products?sale=1&sort=discount&limit=4');
check('sale filter', sale.data.items.every((p) => p.oldPrice > p.price));

const search = await call('/products?q=' + encodeURIComponent('tai nghe'));
check('search "tai nghe"', search.data.total >= 1 && search.data.items[0].name.includes('Tai nghe'), JSON.stringify(search.data.items.map((p) => p.name)));
const noAccent = await call('/products?q=' + encodeURIComponent('dong ho'));
check('search without accents "dong ho"', noAccent.data.items[0]?.name.startsWith('Đồng hồ'), JSON.stringify(noAccent.data.items.map((p) => p.name)));
const anyOrder = await call('/products?q=' + encodeURIComponent('nang kem'));
check('search words in any order', anyOrder.data.items.some((p) => p.sku === 'KC-007'), anyOrder.data.total);

const price = await call('/products?minPrice=200000&maxPrice=500000&limit=100');
check('price range', price.data.items.every((p) => p.price >= 200000 && p.price <= 500000));

const pageTest = await call('/products?limit=5&page=2');
check('pagination', pageTest.data.items.length === 5 && pageTest.data.page === 2 && pageTest.data.pages === 19);

const tn = all.data.items.find((p) => p.sku === 'TN-001');
const detail = await call(`/products/${tn.slug}`);
check('product detail + related', detail.data.product.sku === 'TN-001' && detail.data.related.length > 0);

const hidden = await call('/products/xe-day-em-be-gap-gon');
check('hidden product 404', hidden.status === 404);

const batch = await call(`/products/batch?ids=${tn.id},9999`);
check('batch', batch.data.length === 1);

// Đăng ký, đăng nhập
const reg = await call('/auth/register', { method: 'POST', body: { fullName: 'Khách Thử', email: 'thu@example.com', phone: '0911111111', password: 'abc12345' } });
check('register', reg.status === 201 && reg.data.token, JSON.stringify(reg.data));
const regDup = await call('/auth/register', { method: 'POST', body: { fullName: 'X', email: 'thu@example.com', phone: '0911111112', password: 'abc12345' } });
check('register duplicate email 409', regDup.status === 409);
const regWeak = await call('/auth/register', { method: 'POST', body: { fullName: 'X', email: 'y@example.com', phone: '0911111113', password: 'abc' } });
check('register weak password 400', regWeak.status === 400);
const badLogin = await call('/auth/login', { method: 'POST', body: { login: 'thu@example.com', password: 'sai' } });
check('login wrong password 401', badLogin.status === 401);
const userLogin = await call('/auth/login', { method: 'POST', body: { login: '0911111111', password: 'abc12345' } });
check('login by phone', userLogin.status === 200);
const userToken = userLogin.data.token;
const me = await call('/auth/me', { token: userToken });
check('me', me.data.user.email === 'thu@example.com');

// Đặt hàng
const stockBefore = (await call(`/products/${tn.slug}`)).data.product.stock;
const order = await call('/orders', {
  method: 'POST',
  token: userToken,
  body: {
    customer: { fullName: 'Khách Thử', phone: '0911111111', province: 'Hà Nội', ward: 'Phường Hoàng Liệt', address: '1 Đường Thử' },
    shippingMethod: 'express',
    paymentMethod: 'bank',
    items: [{ productId: tn.id, quantity: 1 }, { productId: tn.id, quantity: 1 }],
  },
});
check('create order', order.status === 201 && /^DH\d{6}-\d{4}$/.test(order.data.code), JSON.stringify(order.data));
check('order total = 2*price + 50000', order.data.total === tn.price * 2 + 50000, order.data.total);
const stockAfter = (await call(`/products/${tn.slug}`)).data.product.stock;
check('stock decreased by 2', stockAfter === stockBefore - 2, `${stockBefore} -> ${stockAfter}`);

const kc = (await call('/products?q=KC-007')).data.items[0];
const outOfStock = await call('/orders', {
  method: 'POST',
  body: { customer: { fullName: 'A', phone: '0911111111', province: 'Hà Nội', ward: 'X', address: 'Y' }, shippingMethod: 'standard', paymentMethod: 'cod', items: [{ productId: kc.id, quantity: 1 }] },
});
check('order out-of-stock 409', outOfStock.status === 409, JSON.stringify(outOfStock.data));
const badPhone = await call('/orders', {
  method: 'POST',
  body: { customer: { fullName: 'A', phone: '123', province: 'Hà Nội', ward: 'X', address: 'Y' }, shippingMethod: 'standard', paymentMethod: 'cod', items: [{ productId: tn.id, quantity: 1 }] },
});
check('order invalid phone 400', badPhone.status === 400);

const lookup = await call('/orders/lookup', { method: 'POST', body: { code: order.data.code.toLowerCase(), phone: '0911 111 111' } });
check('lookup by code + phone', lookup.status === 200 && lookup.data.items[0].quantity === 2 && lookup.data.history.length === 1, JSON.stringify(lookup.data?.items));
const lookupBad = await call('/orders/lookup', { method: 'POST', body: { code: order.data.code, phone: '0900000000' } });
check('lookup wrong phone 404', lookupBad.status === 404);
const mine = await call('/orders/mine', { token: userToken });
check('my orders', mine.data.length === 1 && mine.data[0].code === order.data.code);
const mineDetail = await call(`/orders/mine/${order.data.code}`, { token: userToken });
check('my order detail', mineDetail.status === 200);

// Quản trị
const forbidden = await call('/admin/stats', { token: userToken });
check('customer cannot access admin 403', forbidden.status === 403);
const noAuth = await call('/admin/stats');
check('admin without token 401', noAuth.status === 401);
const adminLogin = await call('/auth/login', { method: 'POST', body: { login: 'admin@khangshop.local', password: 'Admin@123' } });
const adminToken = adminLogin.data.token;
check('admin login', adminLogin.data.user.role === 'admin');

const stats = await call('/admin/stats', { token: adminToken });
check('stats', stats.status === 200 && stats.data.chart.length === 7 && stats.data.pending === 3, JSON.stringify({ pending: stats.data?.pending, today: stats.data?.todayValue, count: stats.data?.todayCount, low: stats.data?.lowStockCount }));

const adminOrders = await call('/admin/orders?status=cho_xac_nhan', { token: adminToken });
check('admin orders filter', adminOrders.data.items.every((o) => o.status === 'cho_xac_nhan') && adminOrders.data.counts.cho_xac_nhan === 3);

const skip = await call(`/admin/orders/${order.data.code}/status`, { method: 'PATCH', token: adminToken, body: { status: 'da_giao' } });
check('cannot skip status 409', skip.status === 409, JSON.stringify(skip.data));
const s1 = await call(`/admin/orders/${order.data.code}/status`, { method: 'PATCH', token: adminToken, body: { status: 'da_xac_nhan' } });
check('advance to da_xac_nhan', s1.data.status === 'da_xac_nhan');
const custCancel = await call('/orders/cancel', { method: 'POST', body: { code: order.data.code, phone: '0911111111' } });
check('customer cannot cancel confirmed order 409', custCancel.status === 409);
const adminCancel = await call(`/admin/orders/${order.data.code}/status`, { method: 'PATCH', token: adminToken, body: { status: 'da_huy' } });
check('admin cancels confirmed order', adminCancel.data.status === 'da_huy' && adminCancel.data.history.length === 3);
const stockRestored = (await call(`/products/${tn.slug}`)).data.product.stock;
check('stock restored after cancel', stockRestored === stockBefore, `${stockBefore} vs ${stockRestored}`);

// Khách tự hủy đơn chờ xác nhận
const order2 = await call('/orders', {
  method: 'POST',
  body: { customer: { fullName: 'Khách lẻ', phone: '0922222222', province: 'Huế', ward: 'Phường Thuận Hóa', address: '2 Đường Thử' }, shippingMethod: 'standard', paymentMethod: 'cod', items: [{ productId: tn.id, quantity: 1 }] },
});
const c2 = await call('/orders/cancel', { method: 'POST', body: { code: order2.data.code, phone: '0922222222' } });
check('guest cancels pending order', c2.data?.status === 'da_huy', JSON.stringify(c2.data));

// Sản phẩm: thêm (kèm ảnh), sửa, ẩn, xóa
const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4c50000000049454e44ae426082', 'hex');
const fd = new FormData();
Object.entries({ name: 'Sản phẩm thử nghiệm', categoryId: String(cats.data[0].id), price: '120000', oldPrice: '150000', stock: '9', description: 'Mô tả', isVisible: 'true' }).forEach(([k, v]) => fd.append(k, v));
fd.append('image', new Blob([png], { type: 'image/png' }), 'thu.png');
const created = await call('/admin/products', { method: 'POST', token: adminToken, form: fd });
check('create product with image', created.status === 201 && /^SP\d{4}$/.test(created.data.sku) && created.data.imageUrl?.startsWith('/uploads/'), JSON.stringify(created.data));
const img = await fetch(BASE.replace('/api', '') + created.data.imageUrl);
check('uploaded image served', img.status === 200);

const badFd = new FormData();
Object.entries({ name: 'Sai giá', categoryId: String(cats.data[0].id), price: '100000', oldPrice: '90000', stock: '1', isVisible: 'true' }).forEach(([k, v]) => badFd.append(k, v));
const badProduct = await call('/admin/products', { method: 'POST', token: adminToken, form: badFd });
check('old price <= price rejected 400', badProduct.status === 400);

const editFd = new FormData();
Object.entries({ name: 'Sản phẩm thử nghiệm đã sửa', sku: created.data.sku, categoryId: String(cats.data[1].id), price: '110000', oldPrice: '', stock: '3', description: '', isVisible: 'true', removeImage: 'true' }).forEach(([k, v]) => editFd.append(k, v));
const edited = await call(`/admin/products/${created.data.id}`, { method: 'PUT', token: adminToken, form: editFd });
check('edit product', edited.data.name.endsWith('đã sửa') && edited.data.oldPrice === null && edited.data.imageUrl === null && edited.data.slug === 'san-pham-thu-nghiem-da-sua', JSON.stringify(edited.data));
const hide = await call(`/admin/products/${created.data.id}/visibility`, { method: 'PATCH', token: adminToken, body: { isVisible: false } });
check('hide product', hide.data.isVisible === false);
const publicHidden = await call(`/products/${edited.data.slug}`);
check('hidden product not public', publicHidden.status === 404);
const lowList = await call('/admin/products?status=low&limit=100', { token: adminToken });
check('admin low-stock filter', lowList.data.items.every((p) => p.stock <= 5));
const del = await call(`/admin/products/${created.data.id}`, { method: 'DELETE', token: adminToken });
check('delete product', del.status === 204);

// Danh mục
const newCat = await call('/admin/categories', { method: 'POST', token: adminToken, body: { name: 'Đồ chơi', sortOrder: 9 } });
check('create category', newCat.status === 201 && newCat.data.slug === 'do-choi');
const delUsedCat = await call(`/admin/categories/${cats.data[0].id}`, { method: 'DELETE', token: adminToken });
check('cannot delete category with products 409', delUsedCat.status === 409);
const delCat = await call(`/admin/categories/${newCat.data.id}`, { method: 'DELETE', token: adminToken });
check('delete empty category', delCat.status === 204);

const customers = await call('/admin/customers', { token: adminToken });
check('customers list (5 sample + seeded + registered)', customers.data.length === 7, customers.data.length);

// ----- Mã giảm giá -----
const buyer = { fullName: 'Khách Thử', phone: '0911111111', province: 'Hà Nội', ward: 'Phường Hoàng Liệt', address: '1 Đường Thử' };
const cheap = (await call('/products?q=CA-014')).data.items[0];
const coupon = (code) => adminCoupons().then((list) => list.find((c) => c.code === code));
const adminCoupons = async () => (await call('/admin/coupons', { token: adminToken })).data;
const placeOrder = (items, extra = {}) => call('/orders', {
  method: 'POST', token: userToken, body: { customer: buyer, shippingMethod: 'standard', paymentMethod: 'cod', items, ...extra },
});

const chk = await call('/coupons/check', { method: 'POST', body: { code: ' khang10 ', items: [{ productId: tn.id, quantity: 1 }] } });
check('coupon check: 10% capped at 50000', chk.status === 200 && chk.data.code === 'KHANG10' && chk.data.discount === 50000, JSON.stringify(chk.data));
const chkUnknown = await call('/coupons/check', { method: 'POST', body: { code: 'KHONGCO', items: [{ productId: tn.id, quantity: 1 }] } });
check('coupon unknown 404', chkUnknown.status === 404);
const chkExpired = await call('/coupons/check', { method: 'POST', body: { code: 'HE2026', items: [{ productId: tn.id, quantity: 1 }] } });
check('coupon expired 409', chkExpired.status === 409, JSON.stringify(chkExpired.data));
const chkMin = await call('/coupons/check', { method: 'POST', body: { code: 'KHANG10', items: [{ productId: cheap.id, quantity: 1 }] } });
check('coupon below minimum order 409', chkMin.status === 409 && cheap.price < 200000, JSON.stringify(chkMin.data));

const usedBefore = (await coupon('GIAM30K')).usedCount;
const orderC = await placeOrder([{ productId: tn.id, quantity: 1 }], { couponCode: 'giam30k' });
check('order with fixed coupon', orderC.status === 201 && orderC.data.discount === 30000 && orderC.data.total === tn.price - 30000 + 30000, JSON.stringify(orderC.data));
const orderCDetail = await call(`/orders/mine/${orderC.data.code}`, { token: userToken });
check('order keeps coupon code and discount', orderCDetail.data.couponCode === 'GIAM30K' && orderCDetail.data.discount === 30000 && orderCDetail.data.subtotal === tn.price);
check('coupon usage counted', (await coupon('GIAM30K')).usedCount === usedBefore + 1);
await call('/orders/cancel', { method: 'POST', body: { code: orderC.data.code, phone: buyer.phone } });
check('coupon usage returned after cancel', (await coupon('GIAM30K')).usedCount === usedBefore);

const once = await placeOrder([{ productId: cheap.id, quantity: 1 }], { couponCode: 'CHAOBAN' });
check('single-use coupon: first order ok', once.status === 201 && once.data.discount === Math.floor(cheap.price * 0.15), JSON.stringify(once.data));
const twice = await placeOrder([{ productId: cheap.id, quantity: 1 }], { couponCode: 'CHAOBAN' });
check('single-use coupon: second order 409', twice.status === 409, JSON.stringify(twice.data));
const badCouponOrder = await placeOrder([{ productId: cheap.id, quantity: 1 }], { couponCode: 'KHONGCO' });
check('order with unknown coupon 404, no order created', badCouponOrder.status === 404);
await call('/orders/cancel', { method: 'POST', body: { code: once.data.code, phone: buyer.phone } });

const newCoupon = await call('/admin/coupons', { method: 'POST', token: adminToken, body: { code: 'thu50', type: 'percent', value: 50, maxDiscount: 20000, minOrder: 0 } });
check('admin creates coupon', newCoupon.status === 201 && newCoupon.data.code === 'THU50' && newCoupon.data.state === 'dang_chay', JSON.stringify(newCoupon.data));
const dupCoupon = await call('/admin/coupons', { method: 'POST', token: adminToken, body: { code: 'THU50', type: 'fixed', value: 10000 } });
check('duplicate coupon code 409', dupCoupon.status === 409);
const badCoupon = await call('/admin/coupons', { method: 'POST', token: adminToken, body: { code: 'SAI', type: 'percent', value: 150 } });
check('coupon percent over 100 rejected 400', badCoupon.status === 400);
const offCoupon = await call(`/admin/coupons/${newCoupon.data.id}/active`, { method: 'PATCH', token: adminToken, body: { isActive: false } });
const chkOff = await call('/coupons/check', { method: 'POST', body: { code: 'THU50', items: [{ productId: tn.id, quantity: 1 }] } });
check('disabled coupon cannot be used', offCoupon.data.state === 'tat' && chkOff.status === 404);
const delCoupon = await call(`/admin/coupons/${newCoupon.data.id}`, { method: 'DELETE', token: adminToken });
check('admin deletes coupon', delCoupon.status === 204);
check('customer cannot manage coupons 403', (await call('/admin/coupons', { token: userToken })).status === 403);

// ----- Đánh giá sản phẩm -----
const rvPath = `/products/${cheap.slug}/reviews`;
const rvAnon = await call(rvPath);
check('reviews public list', rvAnon.status === 200 && rvAnon.data.canReview === false && rvAnon.data.reason === 'login' && typeof rvAnon.data.summary.count === 'number');
check('review without login 401', (await call(rvPath, { method: 'POST', body: { rating: 5 } })).status === 401);
const rvEarly = await call(rvPath, { method: 'POST', token: userToken, body: { rating: 5, comment: 'Chưa mua' } });
check('review before receiving the product 403', rvEarly.status === 403, JSON.stringify(rvEarly.data));

const bought = await placeOrder([{ productId: cheap.id, quantity: 1 }]);
for (const status of ['da_xac_nhan', 'dang_giao', 'da_giao']) {
  await call(`/admin/orders/${bought.data.code}/status`, { method: 'PATCH', token: adminToken, body: { status } });
}
const rvMine = await call(rvPath, { token: userToken });
check('can review after delivery', rvMine.data.canReview === true && rvMine.data.mine === null);
check('review rating out of range 400', (await call(rvPath, { method: 'POST', token: userToken, body: { rating: 6 } })).status === 400);
const rv1 = await call(rvPath, { method: 'POST', token: userToken, body: { rating: 5, comment: 'Dây chắc chắn, sạc nhanh.' } });
check('create review', rv1.status === 201 && rv1.data.rating === 5 && rv1.data.author === 'Khách Thử', JSON.stringify(rv1.data));
const rv2 = await call(rvPath, { method: 'POST', token: userToken, body: { rating: 4, comment: 'Dùng ổn.' } });
const rvAfter = await call(rvPath, { token: userToken });
check('second review replaces the first', rv2.status === 200 && rvAfter.data.summary.count === rvAnon.data.summary.count + 1 && rvAfter.data.mine.rating === 4 && rvAfter.data.items[0].mine === true, JSON.stringify(rvAfter.data.summary));
const rated = (await call(`/products/${cheap.slug}`)).data.product;
check('product shows rating and review count', rated.reviewCount === rvAfter.data.summary.count && rated.rating === rvAfter.data.summary.average, JSON.stringify({ rating: rated.rating, count: rated.reviewCount }));
const adminReviews = await call('/admin/reviews?q=' + encodeURIComponent('Khách Thử'), { token: adminToken });
check('admin review list', adminReviews.data.total === 1 && adminReviews.data.items[0].product.slug === cheap.slug);
const delReview = await call(`/admin/reviews/${adminReviews.data.items[0].id}`, { method: 'DELETE', token: adminToken });
check('admin deletes review', delReview.status === 204 && (await call(rvPath)).data.summary.count === rvAnon.data.summary.count);

// ----- Thống kê doanh thu -----
const report = await call('/admin/reports/revenue', { token: adminToken });
const sumSeries = (key) => report.data.series.reduce((sum, r) => sum + r[key], 0);
check('revenue report default 30 days', report.status === 200 && report.data.days === 30 && report.data.groupBy === 'day' && report.data.series.length === 30, JSON.stringify(report.data?.summary));
check('report series add up to summary', sumSeries('revenue') === report.data.summary.revenue && sumSeries('orderValue') === report.data.summary.orderValue && report.data.summary.revenue > 0);
check('report top products and categories', report.data.topProducts.length > 0 && report.data.topProducts.every((t, i, a) => i === 0 || a[i - 1].amount >= t.amount) && report.data.byCategory.length > 0);
const todayOnly = await call(`/admin/reports/revenue?from=${report.data.to}&to=${report.data.to}`, { token: adminToken });
const statsNow = await call('/admin/stats', { token: adminToken });
check('one-day report matches dashboard', todayOnly.data.days === 1 && todayOnly.data.summary.orderValue === statsNow.data.todayValue && todayOnly.data.summary.orders - todayOnly.data.summary.cancelled === statsNow.data.todayCount, JSON.stringify(todayOnly.data.summary));
const byMonth = await call('/admin/reports/revenue?from=2026-01-01&to=2026-06-30', { token: adminToken });
check('long range grouped by month', byMonth.data.groupBy === 'month' && byMonth.data.series.length === 6);
check('report from after to 400', (await call('/admin/reports/revenue?from=2026-10-10&to=2026-10-01', { token: adminToken })).status === 400);
check('report invalid date 400', (await call('/admin/reports/revenue?from=2026-02-31', { token: adminToken })).status === 400);
check('report range over 366 days 400', (await call('/admin/reports/revenue?from=2024-01-01&to=2026-01-01', { token: adminToken })).status === 400);
check('customer cannot see reports 403', (await call('/admin/reports/revenue', { token: userToken })).status === 403);

const notFound = await call('/khong-co');
check('unknown api 404', notFound.status === 404);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
