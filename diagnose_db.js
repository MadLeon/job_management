import Database from 'better-sqlite3';

const db = new Database('data/record.db');

console.log('='.repeat(80));
console.log('检查数据库中的(job_id, line_number)唯一性');
console.log('='.repeat(80));

// 1. 检查重复的组合
const duplicates = db.prepare(`
  SELECT job_id, line_number, COUNT(*) as cnt
  FROM order_item
  GROUP BY job_id, line_number
  HAVING COUNT(*) > 1
`).all();

console.log('\n数据库中有重复的(job_id, line_number)组合:');
if (duplicates.length === 0) {
  console.log('✓ 没有重复');
} else {
  console.log(`✗ 有 ${duplicates.length} 个重复组合`);
  duplicates.forEach(d => {
    console.log(`  - job_id=${d.job_id}, line_number=${d.line_number}, 重数=${d.cnt}`);
  });
}

// 2. 统计信息
console.log('\n统计信息:');
const stats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    COUNT(DISTINCT job_id) as distinct_jobs,
    COUNT(DISTINCT line_number) as distinct_lines,
    COUNT(DISTINCT (job_id || '|' || line_number)) as unique_combinations
  FROM order_item
`).get();
console.log(`  - 总记录数: ${stats.total}`);
console.log(`  - 不同的job_id: ${stats.distinct_jobs}`);
console.log(`  - 不同的line_number: ${stats.distinct_lines}`);
console.log(`  - 唯一的(job_id, line_number)组合: ${stats.unique_combinations}`);

if (stats.unique_combinations === stats.total) {
  console.log('✓ 所有记录的(job_id, line_number)都是唯一的');
} else {
  console.log(`✗ 有${stats.total - stats.unique_combinations}条记录违反唯一性`);
}

// 3. 检查某些具体的job_id
console.log('\n检查job_id=680的所有order_item:');
const job680Items = db.prepare(`
  SELECT id, line_number FROM order_item WHERE job_id = 680 ORDER BY line_number
`).all();
console.log(`  共有${job680Items.length}条记录`);
job680Items.forEach(item => {
  console.log(`  - id=${item.id}, line_number=${item.line_number}`);
});

db.close();
