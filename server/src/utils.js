export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const ORDER_STATUSES = ['cho_xac_nhan', 'da_xac_nhan', 'dang_giao', 'da_giao', 'da_huy'];

export const STATUS_LABEL = {
  cho_xac_nhan: 'Chờ xác nhận',
  da_xac_nhan: 'Đã xác nhận',
  dang_giao: 'Đang giao',
  da_giao: 'Đã giao',
  da_huy: 'Đã hủy',
};

// Luồng trạng thái hợp lệ: chỉ được đi tới bước kế tiếp
export const NEXT_STATUS = {
  cho_xac_nhan: 'da_xac_nhan',
  da_xac_nhan: 'dang_giao',
  dang_giao: 'da_giao',
};

export const SHIPPING_METHODS = {
  standard: { label: 'Giao tiêu chuẩn', fee: 30000 },
  express: { label: 'Giao nhanh', fee: 50000 },
};

export const PAYMENT_METHODS = ['cod', 'bank'];

export const LOW_STOCK = 5;

export const PHONE_RE = /^0\d{9}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function text(value, max = 255) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function normalizePhone(value) {
  return String(value ?? '').replace(/[\s.-]/g, '');
}

export function toInt(value, { min = 0, max = 2_000_000_000 } = {}) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

export function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

export function pagination(query, defaultLimit = 12) {
  const limit = Math.min(toInt(query.limit, { min: 1, max: 100 }) ?? defaultLimit, 100);
  const page = toInt(query.page, { min: 1 }) ?? 1;
  return { limit, page, offset: (page - 1) * limit };
}

export function publicUser(row) {
  return { id: row.id, fullName: row.full_name, email: row.email, phone: row.phone, role: row.role };
}
