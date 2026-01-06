import Database from 'better-sqlite3';

const db = new Database('data/jobs.db');

console.log('=== 新规范化数据库统计 ===\n');

const tables = ['customer', 'customer_contact', 'purchase_order', 'job', 'order_item', 'part', 'part_tree', 'shipment', 'part_attachment', 'po_note', 'job_note', 'order_item_note', 'part_note', 'shipment_note', 'attachment_note'];

for (const table of tables) {
  const result = db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).get();
  console.log(`${table}: ${result.cnt} 条记录`);
}

console.log('\n=== 样本数据验证 ===\n');

const sampleCustomer = db.prepare('SELECT * FROM customer LIMIT 1').get();
console.log('Customer 样本:', sampleCustomer);

const sampleJob = db.prepare('SELECT * FROM job LIMIT 1').get();
console.log('\nJob 样本:', sampleJob);

const sampleOrderItem = db.prepare('SELECT * FROM order_item LIMIT 1').get();
console.log('\nOrder Item 样本:', sampleOrderItem);

const samplePart = db.prepare('SELECT * FROM part LIMIT 1').get();
console.log('\nPart 样本:', samplePart);

// 验证外键约束
console.log('\n=== 外键约束验证 ===');
const fkCheck = db.prepare('PRAGMA foreign_keys').get();
console.log('外键约束已启用:', fkCheck.foreign_keys === 1);

// 验证关系完整性
const jobWithPO = db.prepare(`
  SELECT j.id, j.job_number, p.po_number
  FROM job j
  JOIN purchase_order p ON j.po_id = p.id
  LIMIT 1
`).get();
console.log('Job -> PO 关系验证:', jobWithPO);

const orderItemWithJob = db.prepare(`
  SELECT oi.id, oi.line_number, j.job_number
  FROM order_item oi
  JOIN job j ON oi.job_id = j.id
  LIMIT 1
`).get();
console.log('OrderItem -> Job 关系验证:', orderItemWithJob);

console.log('\n✅ 数据库验证完成');
db.close();
