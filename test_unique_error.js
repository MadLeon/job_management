import Database from 'better-sqlite3';

const db = new Database('data/record.db');

try {
  // 尝试插入两个相同的(job_id, line_number)
  const insert = db.prepare(`
    INSERT INTO order_item (job_id, line_number, quantity, created_at, updated_at)
    VALUES (?, ?, 1, datetime('now', 'localtime'), datetime('now', 'localtime'))
  `);

  // 第一条应该成功
  insert.run(1, 999);
  console.log('First insert: OK');

  // 第二条应该违反UNIQUE约束
  try {
    insert.run(1, 999);
    console.log('Second insert: OK (unexpected)');
  } catch (e) {
    console.log('UNIQUE constraint error:', e.message);
  }
} catch (e) {
  console.log('Error:', e.message);
} finally {
  db.close();
}
