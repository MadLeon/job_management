import getDB, { getJobNumbers, closeDB } from './src/lib/db.js';

console.log('🧪 测试 db.js 功能...\n');

try {
  // 测试 1: 获取数据库实例
  console.log('✓ 测试 1: 获取数据库实例');
  const db = getDB();
  console.log('  数据库实例获取成功\n');

  // 测试 2: 查询 jobs 表的总行数
  console.log('✓ 测试 2: 查询数据总数');
  const countResult = db.prepare('SELECT COUNT(*) as cnt FROM jobs').get();
  console.log(`  找到 ${countResult.cnt} 条记录\n`);

  // 测试 3: 获取 jobs 表的前 3 条记录
  console.log('✓ 测试 3: 获取前 3 条完整记录');
  const jobs = db.prepare('SELECT * FROM jobs LIMIT 3').all();
  jobs.forEach((job, idx) => {
    console.log(`  记录 ${idx + 1}:`);
    console.log(`    - job_number: ${job.job_number}`);
    console.log(`    - customer_name: ${job.customer_name}`);
    console.log(`    - part_description: ${job.part_description}`);
  });
  console.log();

  // 测试 4: 使用导出的 getJobNumbers 函数
  console.log('✓ 测试 4: 使用 getJobNumbers() 函数');
  const jobNumbers = getJobNumbers();
  console.log(`  获取到 ${jobNumbers.length} 个工作单号`);
  console.log(`  前 3 个: ${jobNumbers.slice(0, 3).map(j => j.job_number).join(', ')}\n`);

  // 测试 5: 查询特定客户的记录
  console.log('✓ 测试 5: 查询特定客户记录');
  const byCustomer = db.prepare('SELECT COUNT(*) as cnt FROM jobs WHERE customer_name = ?').get('Candu');
  console.log(`  Candu 客户有 ${byCustomer.cnt} 条记录\n`);

  console.log('✅ 所有测试通过! db.js 工作正常。');

  closeDB();
  process.exit(0);
} catch (error) {
  console.error('❌ 错误:', error.message);
  closeDB();
  process.exit(1);
}
