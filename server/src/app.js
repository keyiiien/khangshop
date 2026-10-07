import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { config } from './config.js';
import { pool } from './db.js';
import { UPLOAD_DIR } from './upload.js';
import { HttpError } from './utils.js';
import authRoutes from './routes/auth.js';
import { categoryRouter, productRouter } from './routes/catalog.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';

const CLIENT_DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'client', 'dist');

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err instanceof HttpError) return res.status(err.status).json({ message: err.message });
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Ảnh vượt quá 2MB' : 'Tải ảnh lên không thành công';
    return res.status(400).json({ message });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Dữ liệu gửi lên không hợp lệ' });
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Dữ liệu bị trùng, vui lòng kiểm tra lại mã hoặc tên' });
  console.error(err);
  res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau' });
}

export function createApp() {
  const app = express();
  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json({ limit: '1mb' }));
  app.use((req, res, next) => {
    req.body ??= {};
    next();
  });
  app.use('/uploads', express.static(UPLOAD_DIR));

  app.get('/api/health', async (req, res) => {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  });
  app.use('/api/auth', authRoutes);
  app.use('/api/categories', categoryRouter);
  app.use('/api/products', productRouter);
  app.use('/api/orders', orderRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', (req, res) => res.status(404).json({ message: 'Không tìm thấy API' }));

  // Khi đã build frontend (npm run build trong client), server phục vụ luôn giao diện
  if (fs.existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST));
    app.get(/^(?!\/(api|uploads)\/).*/, (req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
