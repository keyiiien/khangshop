import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { HttpError } from './utils.js';

export const UPLOAD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads');
const PRODUCT_DIR = path.join(UPLOAD_DIR, 'products');
fs.mkdirSync(PRODUCT_DIR, { recursive: true });

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

export const productImageUpload = multer({
  storage: multer.diskStorage({
    destination: PRODUCT_DIR,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (EXT[file.mimetype]) cb(null, true);
    else cb(new HttpError(400, 'Chỉ nhận ảnh JPG, PNG hoặc WEBP'));
  },
}).single('image');

export function imageUrlFor(file) {
  return file ? `/uploads/products/${file.filename}` : null;
}

export function removeUploadedImage(url) {
  if (!url?.startsWith('/uploads/products/')) return;
  fs.rm(path.join(PRODUCT_DIR, path.basename(url)), { force: true }, () => {});
}
