import { config } from './config.js';
import { createApp } from './app.js';
import { pool } from './db.js';

const server = createApp().listen(config.port, () => {
  console.log(`KhangShop đang chạy tại http://localhost:${config.port}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Cổng ${config.port} đang bị chương trình khác dùng (có thể KhangShop đã chạy ở cửa sổ khác).`);
    console.error('Tắt chương trình đó, hoặc đổi PORT trong server/.env rồi chạy lại.');
    process.exit(1);
  }
  throw err;
});

// Kiểm tra kết nối CSDL ngay khi khởi động để báo lỗi dễ hiểu thay vì lỗi ở từng trang
pool.query('SELECT 1 FROM products LIMIT 1').catch((err) => {
  const hint = {
    ECONNREFUSED: 'MySQL chưa chạy. Trên Windows: mở Services, bật dịch vụ MySQL (ví dụ MySQL84).',
    ER_ACCESS_DENIED_ERROR: 'Sai tài khoản hoặc mật khẩu MySQL trong server/.env. Chạy lại: npm run setup',
    ER_BAD_DB_ERROR: 'Chưa có CSDL khangshop. Chạy: npm run setup',
    ER_NO_SUCH_TABLE: 'CSDL chưa có bảng. Chạy: npm run db:reset',
  }[err.code];
  console.error(`Không kết nối được cơ sở dữ liệu: ${err.message || err.code}`);
  if (hint) console.error(hint);
});
