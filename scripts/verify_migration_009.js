#!/usr/bin/env node

/**
 * 验证迁移 009 在生产数据库中的执行结果
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = process.cwd();

const prodDbPath = path.join(projectRoot, 'data', 'record.db');

console.log('\n✅ 验证迁移 009 - 生产数据库结果\n');

try {
  const db = new Database(prodDbPath);

  // ============================================================
  // 字段验证
  // ============================================================
  console.log('═'.repeat(60));
  console.log('【字段验证】');
  console.log('═'.repeat(60));

  const columns = db.pragma('table_info(drawing_file)');
  const revisionColumn = columns.find(col => col.name === 'revision');

  console.log(`\n✓ revision 字段存在: 是`);
  console.log(`✓ 字段类型: ${revisionColumn.type}`);
  console.log(`✓ 默认值: '${revisionColumn.dflt_value}'`);
  console.log(`✓ NOT NULL: ${revisionColumn.notnull ? '是' : '否'}`);

  // ============================================================
  // 索引验证
  // ============================================================
  console.log('\n' + '═'.repeat(60));
  console.log('【索引验证】');
  console.log('═'.repeat(60));

  const indices = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='drawing_file' AND name LIKE '%revision%'"
  ).all();

  console.log(`\n✓ 索引数量: ${indices.length}`);
  indices.forEach(idx => {
    console.log(`  - ${idx.name}`);
  });

  // ============================================================
  // 数据验证
  // ============================================================
  console.log('\n' + '═'.repeat(60));
  console.log('【数据验证】');
  console.log('═'.repeat(60));

  const totalCount = db.prepare('SELECT COUNT(*) as cnt FROM drawing_file').get().cnt;
  console.log(`\n✓ drawing_file 总记录数: ${totalCount}`);

  const revisionStats = db.prepare(`
    SELECT revision, COUNT(*) as cnt
    FROM drawing_file
    GROUP BY revision
    ORDER BY cnt DESC
  `).all();

  console.log(`✓ 不同 revision 值数量: ${revisionStats.length}`);

  console.log(`\nrevision 分布:`);
  revisionStats.forEach((row, index) => {
    const percentage = ((row.cnt / totalCount) * 100).toFixed(2);
    console.log(`  ${index + 1}. '${row.revision}': ${row.cnt} 条 (${percentage}%)`);
  });

  // ============================================================
  // 与 part 表关系检查
  // ============================================================
  console.log('\n' + '═'.repeat(60));
  console.log('【part 表关系检查】');
  console.log('═'.repeat(60));

  const withPartId = db.prepare(
    "SELECT COUNT(*) as cnt FROM drawing_file WHERE part_id IS NOT NULL"
  ).get().cnt;

  const withoutPartId = db.prepare(
    "SELECT COUNT(*) as cnt FROM drawing_file WHERE part_id IS NULL"
  ).get().cnt;

  console.log(`\n✓ 有 part_id 的记录: ${withPartId}`);
  console.log(`✓ 无 part_id 的记录: ${withoutPartId}`);

  // ============================================================
  // 性能验证
  // ============================================================
  console.log('\n' + '═'.repeat(60));
  console.log('【性能验证】');
  console.log('═'.repeat(60));

  const testQueries = [
    { desc: "按 revision = '-' 查询", query: "SELECT COUNT(*) as cnt FROM drawing_file WHERE revision = '-'" },
    { desc: "按 part_id 和 revision 联合查询", query: "SELECT COUNT(*) as cnt FROM drawing_file WHERE part_id IS NOT NULL AND revision != '-'" },
  ];

  console.log();
  testQueries.forEach(test => {
    const start = Date.now();
    const result = db.prepare(test.query).get();
    const elapsed = Date.now() - start;
    console.log(`✓ ${test.desc}: ${result.cnt} 条 (${elapsed}ms)`);
  });

  // ============================================================
  // 完整性检查
  // ============================================================
  console.log('\n' + '═'.repeat(60));
  console.log('【完整性检查】');
  console.log('═'.repeat(60));

  // 检查是否有 NULL 值
  const nullCount = db.prepare(
    "SELECT COUNT(*) as cnt FROM drawing_file WHERE revision IS NULL"
  ).get().cnt;

  console.log(`\n✓ revision 为 NULL 的记录: ${nullCount}`);

  // 检查无效的 revision 值（应该只有 '-'、'0'-'9'、'A'-'Z'）
  const invalidCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM drawing_file 
    WHERE revision NOT IN (
      '-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
      'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
      'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
    )
  `).get().cnt;

  console.log(`✓ 无效 revision 值的记录: ${invalidCount}`);

  // ============================================================
  // 总结
  // ============================================================
  console.log('\n' + '═'.repeat(60));
  console.log('【最终总结】');
  console.log('═'.repeat(60));

  const allValid = nullCount === 0 && invalidCount === 0 && indices.length > 0;

  console.log(`\n✅ 字段添加: ✓`);
  console.log(`✅ 索引创建: ${indices.length > 0 ? '✓' : '✗'}`);
  console.log(`✅ 数据完整: ${nullCount === 0 ? '✓' : '✗'}`);
  console.log(`✅ 数据有效: ${invalidCount === 0 ? '✓' : '✗'}`);
  console.log(`✅ 总记录数: ${totalCount}`);

  console.log(`\n${allValid ? '🎉 迁移 009 验证完成 - 所有检查通过！' : '⚠️  有验证项目未通过'}\n`);

  db.close();

} catch (error) {
  console.error('❌ 验证失败:', error.message);
  console.error(error);
  process.exit(1);
}
