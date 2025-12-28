/**
 * 验证 assembly_detail 表 unique_key 字段补全情况
 * 输出未补全或异常记录
 */
import Database from 'better-sqlite3';
const db = new Database('data/jobs.db');

const rows = db.prepare('SELECT id, part_number, drawing_number, unique_key FROM assembly_detail').all();
const missing = rows.filter(r => !r.unique_key);

console.log(`总记录数: ${rows.length}`);
console.log(`未补全 unique_key 的记录数: ${missing.length}`);
if (missing.length > 0) {
  console.log('未补全记录:');
  missing.forEach(r => {
    console.log(`id=${r.id}, part_number=${r.part_number}, drawing_number=${r.drawing_number}`);
  });
} else {
  console.log('所有记录均已补全 unique_key。');
}
db.close();
