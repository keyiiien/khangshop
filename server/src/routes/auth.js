import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { EMAIL_RE, HttpError, PHONE_RE, normalizePhone, publicUser, text } from '../utils.js';

const router = Router();

router.post('/register', async (req, res) => {
  const fullName = text(req.body.fullName, 100);
  const email = text(req.body.email, 150).toLowerCase();
  const phone = normalizePhone(req.body.phone);
  const password = String(req.body.password ?? '');

  if (!fullName) throw new HttpError(400, 'Vui lòng nhập họ và tên');
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Email không hợp lệ');
  if (!PHONE_RE.test(phone)) throw new HttpError(400, 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0');
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    throw new HttpError(400, 'Mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số');
  }

  const [exists] = await pool.query('SELECT email, phone FROM users WHERE email = ? OR phone = ?', [email, phone]);
  if (exists.some((u) => u.email === email)) throw new HttpError(409, 'Email này đã được đăng ký');
  if (exists.length) throw new HttpError(409, 'Số điện thoại này đã được đăng ký');

  const hash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    'INSERT INTO users (full_name, email, phone, password_hash) VALUES (?, ?, ?, ?)',
    [fullName, email, phone, hash],
  );
  const user = { id: result.insertId, full_name: fullName, email, phone, role: 'customer' };
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const login = text(req.body.login, 150).toLowerCase();
  const password = String(req.body.password ?? '');
  if (!login || !password) throw new HttpError(400, 'Vui lòng nhập đầy đủ thông tin đăng nhập');

  const [[user]] = await pool.query('SELECT * FROM users WHERE email = ? OR phone = ?', [login, normalizePhone(login)]);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new HttpError(401, 'Email/số điện thoại hoặc mật khẩu không đúng');
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user) throw new HttpError(401, 'Tài khoản không còn tồn tại');
  res.json({ user: publicUser(user) });
});

export default router;
