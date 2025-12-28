/**
 * @jest-environment node
 *
 * 测试 assembly_detail API unique_key 相关逻辑
 */
describe('assembly_detail API unique_key', () => {
  const Database = require('better-sqlite3');
  const db = new Database('data/jobs.db');
  let createdId = null;
  let testPart = 'TEST-PART-UNIQUE-KEY';
  let testDrawing = 'TEST-DRAWING-UNIQUE-KEY';

  beforeAll(() => {
    // 保证 jobs 表有一条测试记录
    const exists = db.prepare('SELECT 1 FROM jobs WHERE part_number = ?').get(testPart);
    if (!exists) {
      db.prepare(`INSERT INTO jobs (oe_number, job_number, customer_name, job_quantity, part_number, revision, customer_contact, drawing_release, line_number, part_description, unit_price, po_number, packing_slip, packing_quantity, invoice_number, delivery_required_date, delivery_shipped_date, create_timestamp, last_modified, unique_key, priority, file_location, has_assembly_details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?, 'Normal', '', 0)`)
        .run('OE-TEST', 'JOB-TEST', '客户A', 1, testPart, 'A', '', '', '', '', '', '', '', '', '', '2025-12-28', '2025-12-29', 'JOB-TEST|1');
    }
  });

  it('创建 assembly_detail 时应自动补全 unique_key', () => {
    const job = db.prepare('SELECT unique_key FROM jobs WHERE part_number = ? LIMIT 1').get(testPart);
    const unique_key = job && job.unique_key ? job.unique_key : null;
    expect(unique_key).not.toBeNull();

    const stmt = db.prepare(`INSERT INTO assembly_detail (part_number, drawing_number, quantity, status, file_location, delivery_required_date, unique_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`);
    const result = stmt.run(testPart, testDrawing, 1, 'pending', '', '2025-12-28', unique_key);
    createdId = result.lastInsertRowid;

    const detail = db.prepare('SELECT unique_key FROM assembly_detail WHERE id = ?').get(createdId);
    expect(detail.unique_key).toBe(unique_key);
  });

  it('更新 assembly_detail 时可写入 unique_key', () => {
    const job = db.prepare('SELECT unique_key FROM jobs WHERE part_number = ? LIMIT 1').get(testPart);
    const unique_key = job && job.unique_key ? job.unique_key : null;
    expect(unique_key).not.toBeNull();

    db.prepare('UPDATE assembly_detail SET unique_key = ? WHERE id = ?').run(unique_key, createdId);
    const detail = db.prepare('SELECT unique_key FROM assembly_detail WHERE id = ?').get(createdId);
    expect(detail.unique_key).toBe(unique_key);
  });

  afterAll(() => {
    if (createdId) {
      db.prepare('DELETE FROM assembly_detail WHERE id = ?').run(createdId);
    }
    db.prepare('DELETE FROM jobs WHERE part_number = ?').run(testPart);
    db.close();
  });
});
