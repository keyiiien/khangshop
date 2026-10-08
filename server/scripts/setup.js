// Cài đặt CSDL lần đầu trên máy: npm run setup
// - Hỏi mật khẩu MySQL của tài khoản quản trị (root), gõ ẩn, KHÔNG lưu lại
// - Tạo tài khoản MySQL riêng cho website (chỉ có quyền trên CSDL khangshop) với mật khẩu ngẫu nhiên
// - Ghi thông tin kết nối vào server/.env rồi tạo bảng và dữ liệu mẫu (scripts/init-db.js)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = path.join(SERVER_DIR, '.env');
const APP_USER = 'khangshop';

function ask(question, { hidden = false } = {}) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) {
    rl._writeToOutput = (s) => {
      if (s.startsWith(question)) rl.output.write(question);
      else if (s.includes('\n') || s.includes('\r')) rl.output.write('\n');
      else rl.output.write('*'.repeat(s.length));
    };
  }
  return new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    resolve(answer);
  }));
}

const existing = fs.existsSync(ENV_PATH) ? dotenv.parse(fs.readFileSync(ENV_PATH)) : {};
const host = existing.DB_HOST || 'localhost';
const port = Number(existing.DB_PORT || 3306);
const database = existing.DB_NAME || 'khangshop';

console.log('== Cài đặt cơ sở dữ liệu KhangShop ==');
console.log(`MySQL: ${host}:${port}, CSDL: ${database}\n`);
const adminUser = (await ask('Tài khoản quản trị MySQL (Enter = root): ')).trim() || 'root';

let admin;
for (let attempt = 1; attempt <= 3 && !admin; attempt += 1) {
  const password = await ask(`Mật khẩu của ${adminUser} (gõ sẽ không hiện): `, { hidden: true });
  try {
    admin = await mysql.createConnection({ host, port, user: adminUser, password });
  } catch (err) {
    console.log(err.code === 'ER_ACCESS_DENIED_ERROR' ? '  Sai mật khẩu, thử lại.' : `  Không kết nối được MySQL: ${err.message}`);
    if (err.code !== 'ER_ACCESS_DENIED_ERROR') process.exit(1);
  }
}
if (!admin) {
  console.log('Đã thử 3 lần không thành công. Chạy lại "npm run setup" khi nhớ mật khẩu.');
  process.exit(1);
}

// Tài khoản riêng cho website, chỉ có quyền trên CSDL của website
const appPassword = crypto.randomBytes(18).toString('base64url');
await admin.query('CREATE USER IF NOT EXISTS ?@? IDENTIFIED BY ?', [APP_USER, 'localhost', appPassword]);
await admin.query('ALTER USER ?@? IDENTIFIED BY ?', [APP_USER, 'localhost', appPassword]);
await admin.query(`GRANT ALL PRIVILEGES ON \`${database}\`.* TO ?@?`, [APP_USER, 'localhost']);
await admin.end();
console.log(`\nĐã tạo tài khoản MySQL "${APP_USER}" dành riêng cho website.`);

const env = {
  PORT: existing.PORT || '4000',
  DB_HOST: host,
  DB_PORT: String(port),
  DB_USER: APP_USER,
  DB_PASSWORD: appPassword,
  DB_NAME: database,
  JWT_SECRET: existing.JWT_SECRET && !existing.JWT_SECRET.startsWith('doi-chuoi')
    ? existing.JWT_SECRET
    : crypto.randomBytes(32).toString('hex'),
  CLIENT_ORIGIN: existing.CLIENT_ORIGIN || 'http://localhost:5173',
};
fs.writeFileSync(
  ENV_PATH,
  `# Tạo bởi "npm run setup". Không đưa file này lên GitHub.\n${Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n')}\n`,
);
console.log('Đã ghi cấu hình vào server/.env\n');

const result = spawnSync(process.execPath, [path.join(SERVER_DIR, 'scripts', 'init-db.js'), ...process.argv.slice(2)], {
  cwd: SERVER_DIR,
  stdio: 'inherit',
});
if (result.status === 0) console.log('\nXong! Chạy website: npm start  rồi mở http://localhost:4000');
process.exit(result.status ?? 1);
