import Database from 'better-sqlite3';

const db = new Database('data/record.db');

// 检查 is_assembly 的分布
console.log('【is_assembly 分布统计】\n');
const result = db.prepare(`
  SELECT 
    CASE 
      WHEN is_assembly = 1 THEN 'is_assembly = 1 (有-GA-)'
      WHEN is_assembly = 0 THEN 'is_assembly = 0 (old logic)'
      ELSE 'is_assembly = NULL (无-GA-)'
    END as status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM part), 2) as percentage
  FROM part
  GROUP BY is_assembly
  ORDER BY is_assembly DESC
`).all();

result.forEach(row => {
  console.log(`${row.status}: ${row.count} 个 (${row.percentage}%)`);
});

// 检查几个样本
console.log('\n【样本数据（is_assembly=1）】');
const samples1 = db.prepare('SELECT id, drawing_number, revision FROM part WHERE is_assembly = 1 LIMIT 3').all();
samples1.forEach(row => console.log(`  ID: ${row.id}, Drawing: ${row.drawing_number}, Rev: ${row.revision}`));

console.log('\n【样本数据（is_assembly=NULL）】');
const samplesNull = db.prepare('SELECT id, drawing_number, revision FROM part WHERE is_assembly IS NULL LIMIT 3').all();
samplesNull.forEach(row => console.log(`  ID: ${row.id}, Drawing: ${row.drawing_number}, Rev: ${row.revision}`));

console.log('\n总零件数:', db.prepare('SELECT COUNT(*) as cnt FROM part').get().cnt);

db.close();
