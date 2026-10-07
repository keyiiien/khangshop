import mysql from 'mysql2/promise';
import { config } from './config.js';

// Mọi thời gian lưu và đọc theo giờ Việt Nam
export const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: '+07:00',
  decimalNumbers: true,
});

pool.on('connection', (conn) => {
  conn.query("SET time_zone = '+07:00'");
});

// Chạy fn trong một transaction, tự rollback nếu lỗi
export async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
