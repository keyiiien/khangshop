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
check('customers list', customers.data.length === 2, customers.data.length);

const notFound = await call('/khong-co');
check('unknown api 404', notFound.status === 404);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
