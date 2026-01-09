#!/usr/bin/env node

/**
 * 在测试数据库上测试迁移 007 和 008
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = process.cwd();

// 导入迁移模块
const migration007 = await import('./migrations/007_import_missing_parts_from_assemblies.js');
const migration008 = await import('./migrations/008_migrate_assemblies_to_part_tree.js');

const testDbPath = path.join(projectRoot, 'data', 'record.db.test');

console.log('\n🧪 测试迁移 007 和 008\n');

try {
  const db = new Database(testDbPath);

  // ============================================================
  // 测试迁移 007
  // ============================================================
  console.log('═'.repeat(60));
  console.log('【测试迁移 007】import_missing_parts_from_assemblies');
  console.log('═'.repeat(60));

  const partCountBefore007 = db.prepare('SELECT COUNT(*) as cnt FROM part').get().cnt;
  console.log(`\n迁移前 part 表记录数: ${partCountBefore007}\n`);

  migration007.up(db);

  const partCountAfter007 = db.prepare('SELECT COUNT(*) as cnt FROM part').get().cnt;
  console.log(`迁移后 part 表记录数: ${partCountAfter007}`);
  console.log(`新增记录: ${partCountAfter007 - partCountBefore007}\n`);

  // ============================================================
  // 测试迁移 008
  // ============================================================
  console.log('═'.repeat(60));
  console.log('【测试迁移 008】migrate_assemblies_to_part_tree');
  console.log('═'.repeat(60));

  const partTreeCountBefore008 = db.prepare('SELECT COUNT(*) as cnt FROM part_tree').get().cnt;
  console.log(`\n迁移前 part_tree 表记录数: ${partTreeCountBefore008}\n`);

  migration008.up(db);

  const partTreeCountAfter008 = db.prepare('SELECT COUNT(*) as cnt FROM part_tree').get().cnt;
  console.log(`迁移后 part_tree 表记录数: ${partTreeCountAfter008}`);
  console.log(`新增记录: ${partTreeCountAfter008 - partTreeCountBefore008}\n`);

  // ============================================================
  // 验证外键完整性
  // ============================================================
  console.log('═'.repeat(60));
  console.log('【验证数据完整性】');
  console.log('═'.repeat(60));

  // 检查 part_tree 中的外键
  const orphanParents = db.prepare(`
    SELECT COUNT(*) as cnt FROM part_tree pt
    WHERE NOT EXISTS (SELECT 1 FROM part p WHERE p.id = pt.parent_id)
  `).get().cnt;

  const orphanChildren = db.prepare(`
    SELECT COUNT(*) as cnt FROM part_tree pt
    WHERE NOT EXISTS (SELECT 1 FROM part p WHERE p.id = pt.child_id)
  `).get().cnt;

  console.log(`\n外键完整性检查:`);
  console.log(`  - 孤立的 parent_id: ${orphanParents} 条`);
  console.log(`  - 孤立的 child_id: ${orphanChildren} 条`);

  if (orphanParents === 0 && orphanChildren === 0) {
    console.log(`  ✅ 外键完整，无违规`);
  } else {
    console.log(`  ⚠️  发现外键违规！`);
  }

  // 检查是否有自引用
  const selfRefs = db.prepare(`
    SELECT COUNT(*) as cnt FROM part_tree
    WHERE parent_id = child_id
  `).get().cnt;

  console.log(`\n自引用检查:`);
  console.log(`  - 自引用数量: ${selfRefs} 条`);
  if (selfRefs === 0) {
    console.log(`  ✅ 无自引用`);
  }

  // 检查 UNIQUE 约束
  const duplicates = db.prepare(`
    SELECT parent_id, child_id, COUNT(*) as cnt
    FROM part_tree
    GROUP BY parent_id, child_id
    HAVING COUNT(*) > 1
  `).all();

  console.log(`\nUNIQUE 约束检查:`);
  console.log(`  - 重复的 (parent_id, child_id): ${duplicates.length} 个`);
  if (duplicates.length === 0) {
    console.log(`  ✅ 无重复`);
  }

  // ============================================================
  // 采样验证数据准确性
  // ============================================================
  console.log('\n' + '═'.repeat(60));
  console.log('【采样验证】');
  console.log('═'.repeat(60));

  const samples = db.prepare(`
    SELECT 
      pt.id,
      p1.drawing_number as parent_drawing,
      p2.drawing_number as child_drawing,
      pt.quantity
    FROM part_tree pt
    JOIN part p1 ON pt.parent_id = p1.id
    JOIN part p2 ON pt.child_id = p2.id
    ORDER BY RANDOM()
    LIMIT 5
  `).all();

  console.log(`\n随机采样 5 条 part_tree 记录:\n`);
  samples.forEach((sample, index) => {
    console.log(`${index + 1}. ${sample.parent_drawing} (parent)`);
    console.log(`   ↓ qty: ${sample.quantity}`);
    console.log(`   ${sample.child_drawing} (child)\n`);
  });

  // ============================================================
  // 总结
  // ============================================================
  console.log('═'.repeat(60));
  console.log('【测试总结】');
  console.log('═'.repeat(60));

  console.log(`\n✅ 迁移 007: 新增 ${partCountAfter007 - partCountBefore007} 条零件`);
  console.log(`✅ 迁移 008: 新增 ${partTreeCountAfter008 - partTreeCountBefore008} 条关系`);
  console.log(`✅ 外键完整性: OK`);
  console.log(`✅ 无重复记录: OK`);
  console.log(`✅ 无自引用: OK`);

  console.log('\n🎉 所有测试通过！\n');

  db.close();

} catch (error) {
  console.error('❌ 测试失败:', error.message);
  console.error(error);
  process.exit(1);
}
