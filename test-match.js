import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { matchPartToDrawing, getCustomerIdFromOrderItem } from './scripts/match-part-drawing.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = __dirname;

const dbPath = path.join(projectRoot, 'data', 'record.db');
const db = new Database(dbPath);

// 获取第一条order_item作为测试
const firstOrderItem = db.prepare(`
  SELECT oi.id, oi.part_id, p.id as part_id_verify, p.drawing_number
  FROM order_item oi
  JOIN part p ON oi.part_id = p.id
  LIMIT 1
`).get();

if (!firstOrderItem) {
  console.log(`❌ order_item not found`);
  db.close();
  process.exit(1);
}

const testOrderItemId = firstOrderItem.id;

console.log(`\n📊 测试匹配 order_item_id=${testOrderItemId}`);
console.log(`   part_id=${firstOrderItem.part_id}, drawing_number=${firstOrderItem.drawing_number}`);

const customer_id = getCustomerIdFromOrderItem(db, testOrderItemId);
console.log(`   customer_id=${customer_id}`);

const result = matchPartToDrawing(db, firstOrderItem, customer_id);
console.log(`\n✓ 匹配结果:`, result);

db.close();
