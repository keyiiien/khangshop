// Kiểm thử giao diện bằng Chrome không giao diện (puppeteer-core).
// Cần: client đã build, server đang chạy, CSDL mẫu vừa tạo lại. Chạy: npm install && node ui.test.mjs
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const BASE = process.env.SITE ?? 'http://localhost:4000';
const OUT = new URL('./shots/', import.meta.url);
fs.mkdirSync(OUT, { recursive: true });
const errors = [];
const results = [];

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-first-run', '--lang=vi-VN'],
});

async function newPage(width = 1440, height = 900, mobile = false) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
  page.on('console', (m) => m.type() === 'error' && errors.push(`${page.url()} :: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${page.url()} :: ${e.message}`));
  return page;
}

async function shot(page, name, fullPage = true) {
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, OUT)), fullPage });
}

async function go(page, path) {
  await page.goto(BASE + path, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
}

function check(name, cond, extra = '') {
  results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  ' + extra}`);
}

async function clickText(page, selector, text) {
  const handles = await page.$$(selector);
  for (const h of handles) {
    const t = await h.evaluate((el) => el.textContent.trim());
    if (t.includes(text)) {
      await h.click();
      return true;
    }
  }
  throw new Error(`Không thấy "${text}" trong ${selector}`);
}

// ----- Khách hàng, desktop -----
const page = await newPage();
await go(page, '/');
check('home: 8 categories', (await page.$$('.category-tile')).length === 8);
check('home: product cards', (await page.$$('.product-card')).length >= 12);
check('home: no horizontal scroll', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await shot(page, '01-home');

await go(page, '/danh-muc/dien-tu?sort=price_asc');
check('category title', (await page.$eval('.banner h1', (el) => el.textContent)) === 'Điện tử');
await shot(page, '02-category');

await go(page, '/san-pham?q=tai%20nghe');
check('search results', (await page.$$('.product-card')).length >= 1);

await go(page, '/san-pham/tai-nghe-bluetooth-chong-on-chu-dong');
await page.click('.qty button[aria-label="Tăng số lượng"]');
await clickText(page, '.detail-info button', 'Thêm vào giỏ');
await page.waitForSelector('.alert-success');
check('detail: added to cart', (await page.$eval('.site-header .badge', (el) => el.textContent)) === '2');
await shot(page, '03-detail');

await go(page, '/san-pham/binh-giu-nhiet-inox-750ml');
await clickText(page, '.detail-info button', 'Thêm vào giỏ');

await go(page, '/gio-hang');
check('cart: 2 lines', (await page.$$('.cart-line')).length === 2);
await page.click('.cart-line:nth-of-type(2) .qty button[aria-label="Tăng số lượng"]');
check('cart: badge 4', (await page.$eval('.site-header .badge', (el) => el.textContent)) === '4');
await shot(page, '04-cart');

await clickText(page, 'a', 'Tiến hành thanh toán');
await page.waitForSelector('#tt-fullName');
// Gửi khi chưa điền: phải báo lỗi
await clickText(page, 'button[type="submit"]', 'Đặt hàng');
check('checkout: validation errors shown', (await page.$$('.field-error')).length >= 5);
await page.type('#tt-fullName', 'Trần Văn Thử');
await page.type('#tt-phone', '0933333333');
await page.select('#tt-province', 'Hà Nội');
await page.type('#tt-ward', 'Phường Hoàng Liệt');
await page.type('#tt-address', '10 Đường Thử Nghiệm');
await clickText(page, 'label.option', 'Giao nhanh');
await clickText(page, 'label.option', 'Chuyển khoản');
await page.click('#tt-agree');
await shot(page, '05-checkout');
await clickText(page, 'button[type="submit"]', 'Đặt hàng');
try {
  await page.waitForSelector('.success-banner', { timeout: 8000 });
} catch {
  await shot(page, '06-debug');
  console.log('DEBUG url', page.url(), await page.evaluate(() => document.querySelector('main')?.innerText.slice(0, 600)));
}
check('order placed', (await page.$eval('h1', (el) => el.textContent)).includes('Đặt hàng thành công'));
check('bank info shown', (await page.content()).includes('Thông tin chuyển khoản'));
check('cart cleared', (await page.$eval('.site-header .badge', (el) => el.textContent)) === '0');
const orderCode = page.url().split('/').pop();
await shot(page, '06-order-success');

page.on('dialog', (d) => d.accept());
await clickText(page, 'button', 'Hủy đơn hàng');
await page.waitForFunction(() => document.body.textContent.includes('Đã hủy'));
check('customer cancelled order', true);

await go(page, '/dang-nhap?tab=dang-ky');
await shot(page, '07-register', false);

// ----- Quản trị -----
const admin = await newPage();
admin.on('dialog', (d) => d.accept());
await go(admin, '/dang-nhap');
await admin.type('#dn-tk', 'admin@khangshop.local');
await admin.type('#dn-mk', 'Admin@123');
await admin.click('.auth-form form button[type="submit"]');
try {
  await admin.waitForSelector('.kpi', { timeout: 8000 });
} catch {
  await shot(admin, '08-debug');
  console.log('DEBUG admin', admin.url(), await admin.evaluate(() => document.body.innerText.slice(0, 800)));
}
check('admin dashboard loaded', admin.url().endsWith('/quan-tri'));
await shot(admin, '08-admin-dashboard');

await go(admin, '/quan-tri/don-hang?status=cho_xac_nhan');
const firstDetail = await admin.$('table.data button');
await firstDetail.click();
await admin.waitForSelector('.printable');
await clickText(admin, '.printable button', 'Xác nhận đơn hàng');
await admin.waitForFunction(() => document.querySelector('.printable').textContent.includes('Bàn giao cho vận chuyển'));
check('admin advanced order status', true);
await shot(admin, '09-admin-orders');

await go(admin, '/quan-tri/san-pham');
await clickText(admin, 'button', 'Thêm sản phẩm');
await admin.waitForSelector('#sp-ten');
await admin.type('#sp-ten', 'Bình nước thể thao 1 lít');
await admin.select('#sp-dm', await admin.$eval('#sp-dm option:nth-child(8)', (o) => o.value));
await admin.type('#sp-gia', '99000');
await admin.type('#sp-ton', '20');
await clickText(admin, 'button[type="submit"]', 'Lưu sản phẩm');
await admin.waitForSelector('.alert-success');
check('admin created product', (await admin.$eval('.alert-success', (el) => el.textContent)).includes('Bình nước thể thao'));
await clickText(admin, 'button', 'Thêm sản phẩm');
await admin.waitForSelector('#sp-ten');
await shot(admin, '10-admin-products');

await go(admin, '/quan-tri/danh-muc');
await shot(admin, '11-admin-categories', false);
await go(admin, '/quan-tri/khach-hang');
check('admin customers', (await admin.$$('table.data tbody tr')).length >= 1);

// ----- Điện thoại -----
const mobile = await newPage(390, 844, true);
await go(mobile, '/');
check('mobile home: no horizontal scroll', await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), await mobile.evaluate(() => document.documentElement.scrollWidth));
await shot(mobile, '12-mobile-home');
await go(mobile, '/san-pham/tai-nghe-bluetooth-chong-on-chu-dong');
check('mobile detail: no horizontal scroll', await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await go(mobile, `/don-hang/${orderCode}`);
const adminMobile = await newPage(390, 844, true);
await adminMobile.goto(BASE + '/', { waitUntil: 'networkidle0' });
await adminMobile.evaluate((t) => localStorage.setItem('khangshop.token', t), await admin.evaluate(() => localStorage.getItem('khangshop.token')));
await go(adminMobile, '/quan-tri');
check('mobile admin: no horizontal scroll', await adminMobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), await adminMobile.evaluate(() => document.documentElement.scrollWidth));
await shot(adminMobile, '13-mobile-admin');

await browser.close();
console.log(results.join('\n'));
console.log(`\nConsole errors (${errors.length}):\n${errors.join('\n')}`);

process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
