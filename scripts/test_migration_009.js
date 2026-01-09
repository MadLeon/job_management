#!/usr/bin/env node

/**
 * 测试迁移 009: 为 drawing_file 添加 revision 字段
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = process.cwd();

// 导入迁移模块
const migration009 = await import('./migrations/009_add_revision_to_drawing_file.js');

const testDbPath = path.join(projectRoot, 'data', 'record.db.test2');

console.log('\n🧪 测试迁移 009: add_revision_to_drawing_file\n');

try {
  const db = new Database(testDbPath);

  // ============================================================
  // 测试迁移 009
  // ============================================================
  console.log('═'.repeat(60));
  console.log('【测试迁移 009】add_revision_to_drawing_file');
  console.log('═'.repeat(60));

  // 迁移前检查
  console.log('\n【迁移前】');
  const columnsBefore = db.pragma('table_info(drawing_file)');
  const hasRevisionBefore = columnsBefore.some(col => col.name === 'revision');
  console.log(`  - revision 字段存在: ${hasRevisionBefore ? '✓' : '✗'}`);

  const countBefore = db.prepare('SELECT COUNT(*) as cnt FROM drawing_file').get().cnt;
  console.log(`  - drawing_file 总记录数: ${countBefore}`);

  // 执行迁移
  console.log('\n【执行迁移】\n');
  migration009.up(db);

  // 迁移后检查
  console.log('\n【迁移后】');
  const columnsAfter = db.pragma('table_info(drawing_file)');
  const hasRevisionAfter = columnsAfter.some(col => col.name === 'revision');
  console.log(`  ✓ revision 字段存在: ${hasRevisionAfter}`);

  // 检查索引
  const indices = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='drawing_file' AND name LIKE '%revision%'"
  ).all();
  console.log(`  ✓ revision 索引创建: ${indices.length > 0 ? '✓' : '✗'}`);

  // ============================================================
  // 数据验证
  // ============================================================
  console.log('\n【数据验证】');

  // 检查 revision 分布
  const revisionStats = db.prepare(`
    SELECT revision, COUNT(*) as cnt
    FROM drawing_file
    GROUP BY revision
    ORDER BY cnt DESC
  `).all();

  console.log(`\n  ✓ 不同 revision 数: ${revisionStats.length}`);

  let totalCount = 0;
  revisionStats.forEach(row => {
    totalCount += row.cnt;
  });
  console.log(`  ✓ 总验证记录: ${totalCount}`);

  // 显示 top 10
  console.log(`\n  Top 10 revision 分布:`);
  revisionStats.slice(0, 10).forEach((row, index) => {
    const percentage = ((row.cnt / totalCount) * 100).toFixed(2);
    console.log(`    ${index + 1}. revision '${row.revision}': ${row.cnt} (${percentage}%)`);
  });

  // ============================================================
  // 样本验证
  // ============================================================
  console.log('\n【采样验证】');

  const samples = db.prepare(`
    SELECT df.id, df.file_name, df.revision, p.drawing_number, p.revision as part_revision
    FROM drawing_file df
    LEFT JOIN part p ON df.part_id = p.id
    WHERE df.part_id IS NOT NULL
    ORDER BY RANDOM()
    LIMIT 5
  `).all();

  console.log(`\n  随机采样 5 条有 part_id 的记录:\n`);
  samples.forEach((sample, index) => {
    const match = sample.revision === sample.part_revision ? '✓' : '✗';
    console.log(`  ${index + 1}. ${match} file: ${sample.file_name}`);
    console.log(`     revision: '${sample.revision}' (from part: '${sample.part_revision}')\n`);
  });

  // 检查无 part_id 的记录
  const noPartIdCount = db.prepare(
    "SELECT COUNT(*) as cnt FROM drawing_file WHERE part_id IS NULL"
  ).get().cnt;

  const noPartIdDefaultCount = db.prepare(
    "SELECT COUNT(*) as cnt FROM drawing_file WHERE part_id IS NULL AND revision = '-'"
  ).get().cnt;

  console.log(`  无 part_id 的记录:`);
  console.log(`    - 总数: ${noPartIdCount}`);
  console.log(`    - 使用默认值 '-': ${noPartIdDefaultCount}`);
  console.log(`    ✓ 一致性: ${noPartIdCount === noPartIdDefaultCount ? '✓' : '✗'}`);

  // ============================================================
  // 性能验证（查询索引）
  // ============================================================
  console.log('\n【性能验证】');

  const perfStart = Date.now();
  const revisionQuery = db.prepare(
    "SELECT COUNT(*) as cnt FROM drawing_file WHERE revision = 'A'"
  ).get();
  const perfEnd = Date.now();

  console.log(`\n  ✓ 按 revision 查询: ${revisionQuery.cnt} 条记录`);
  console.log(`  ✓ 查询耗时: ${perfEnd - perfStart} ms`);

  // ============================================================
  // 总结
  // ============================================================
  console.log('\n' + '═'.repeat(60));
  console.log('【测试总结】');
  console.log('═'.repeat(60));

  const allTestsPassed =
    hasRevisionAfter &&
    indices.length > 0 &&
    revisionStats.length > 0 &&
    noPartIdCount === noPartIdDefaultCount;

  console.log(`\n✅ 字段添加: ${hasRevisionAfter ? '✓' : '✗'}`);
  console.log(`✅ 索引创建: ${indices.length > 0 ? '✓' : '✗'}`);
  console.log(`✅ 数据初始化: ${revisionStats.length > 0 ? '✓' : '✗'}`);
  console.log(`✅ 数据一致性: ${noPartIdCount === noPartIdDefaultCount ? '✓' : '✗'}`);

  console.log(`\n${allTestsPassed ? '🎉 所有测试通过！' : '⚠️  有测试未通过'}\n`);

  db.close();

} catch (error) {
  console.error('❌ 测试失败:', error.message);
  console.error(error);
  process.exit(1);
}
