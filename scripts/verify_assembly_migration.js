#!/usr/bin/env node

/**
 * 完整验证 assemblies 迁移结果
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = process.cwd();

const db = new Database(path.join(projectRoot, 'data', 'record.db'), { readonly: true });

console.log('\n📊 Assemblies 迁移完整验证\n');

try {
  // ============================================================
  // 1. 基本统计
  // ============================================================
  console.log('═'.repeat(60));
  console.log('【1】基本统计');
  console.log('═'.repeat(60));

  const partCount = db.prepare('SELECT COUNT(*) as cnt FROM part').get().cnt;
  const partTreeCount = db.prepare('SELECT COUNT(*) as cnt FROM part_tree').get().cnt;
  const partAssemblyCount = db.prepare('SELECT COUNT(*) as cnt FROM part WHERE is_assembly = 1').get().cnt;
  const partNormalCount = db.prepare('SELECT COUNT(*) as cnt FROM part WHERE is_assembly = 0').get().cnt;

  console.log(`\n- 总零件数: ${partCount}`);
  console.log(`  - 总装件 (is_assembly=1): ${partAssemblyCount}`);
  console.log(`  - 普通零件 (is_assembly=0): ${partNormalCount}`);
  console.log(`\n- 部件关系数 (part_tree): ${partTreeCount}`);

  // ============================================================
  // 2. is_assembly 标记验证
  // ============================================================
  console.log('\n' + '═'.repeat(60));
  console.log('【2】is_assembly 标记验证');
  console.log('═'.repeat(60));

  const withGAAssembly = db.prepare(
    "SELECT COUNT(*) as cnt FROM part WHERE drawing_number LIKE '%-GA-%' AND is_assembly = 1"
  ).get().cnt;

  const withGANotAssembly = db.prepare(
    "SELECT COUNT(*) as cnt FROM part WHERE drawing_number LIKE '%-GA-%' AND is_assembly = 0"
  ).get().cnt;

  const withoutGAAssembly = db.prepare(
    "SELECT COUNT(*) as cnt FROM part WHERE drawing_number NOT LIKE '%-GA-%' AND is_assembly = 1"
  ).get().cnt;

  const withoutGANotAssembly = db.prepare(
    "SELECT COUNT(*) as cnt FROM part WHERE drawing_number NOT LIKE '%-GA-%' AND is_assembly = 0"
  ).get().cnt;

  console.log(`\n含 -GA-:`);
  console.log(`  - is_assembly=1 (✅ 正确): ${withGAAssembly}`);
  console.log(`  - is_assembly=0 (❌ 错误): ${withGANotAssembly}`);

  console.log(`\n不含 -GA-:`);
  console.log(`  - is_assembly=1 (可能) : ${withoutGAAssembly}`);
  console.log(`  - is_assembly=0 (✅ 正确): ${withoutGANotAssembly}`);

  if (withGANotAssembly === 0 && withoutGAAssembly === 0) {
    console.log(`\n✅ is_assembly 标记完全正确`);
  }

  // ============================================================
  // 3. 外键完整性
  // ============================================================
  console.log('\n' + '═'.repeat(60));
  console.log('【3】外键完整性检查');
  console.log('═'.repeat(60));

  const orphanParents = db.prepare(`
    SELECT COUNT(*) as cnt FROM part_tree
    WHERE NOT EXISTS (SELECT 1 FROM part p WHERE p.id = part_tree.parent_id)
  `).get().cnt;

  const orphanChildren = db.prepare(`
    SELECT COUNT(*) as cnt FROM part_tree
    WHERE NOT EXISTS (SELECT 1 FROM part p WHERE p.id = part_tree.child_id)
  `).get().cnt;

  console.log(`\n- 孤立的 parent_id: ${orphanParents}`);
  console.log(`- 孤立的 child_id: ${orphanChildren}`);

  if (orphanParents === 0 && orphanChildren === 0) {
    console.log(`\n✅ 所有外键都有效`);
  } else {
    console.log(`\n⚠️  发现外键违规！`);
  }

  // ============================================================
  // 4. 自引用检查
  // ============================================================
  console.log('\n' + '═'.repeat(60));
  console.log('【4】自引用检查');
  console.log('═'.repeat(60));

  const selfRefs = db.prepare(`
    SELECT COUNT(*) as cnt FROM part_tree
    WHERE parent_id = child_id
  `).get().cnt;

  console.log(`\n- 自引用数量: ${selfRefs}`);

  if (selfRefs === 0) {
    console.log(`✅ 无自引用`);
  } else {
    console.log(`⚠️  发现 ${selfRefs} 条自引用！`);
  }

  // ============================================================
  // 5. UNIQUE 约束检查
  // ============================================================
  console.log('\n' + '═'.repeat(60));
  console.log('【5】UNIQUE 约束检查');
  console.log('═'.repeat(60));

  const duplicates = db.prepare(`
    SELECT parent_id, child_id, COUNT(*) as cnt
    FROM part_tree
    GROUP BY parent_id, child_id
    HAVING COUNT(*) > 1
  `).all();

  console.log(`\n- 重复的 (parent_id, child_id): ${duplicates.length}`);

  if (duplicates.length === 0) {
    console.log(`✅ 无重复，UNIQUE 约束正常`);
  } else {
    console.log(`⚠️  发现 ${duplicates.length} 组重复！`);
    duplicates.slice(0, 5).forEach(dup => {
      console.log(`  - parent_id=${dup.parent_id}, child_id=${dup.child_id}: ${dup.cnt} 条`);
    });
  }

  // ============================================================
  // 6. quantity 统计
  // ============================================================
  console.log('\n' + '═'.repeat(60));
  console.log('【6】数量(quantity)统计');
  console.log('═'.repeat(60));

  const quantityStats = db.prepare(`
    SELECT 
      MIN(quantity) as min_qty,
      MAX(quantity) as max_qty,
      AVG(quantity) as avg_qty,
      COUNT(CASE WHEN quantity <= 0 THEN 1 END) as invalid_qty
    FROM part_tree
  `).get();

  console.log(`\n- 最小数量: ${quantityStats.min_qty}`);
  console.log(`- 最大数量: ${quantityStats.max_qty}`);
  console.log(`- 平均数量: ${quantityStats.avg_qty.toFixed(2)}`);
  console.log(`- 无效数量 (≤0): ${quantityStats.invalid_qty}`);

  if (quantityStats.invalid_qty === 0 && quantityStats.min_qty > 0) {
    console.log(`✅ 所有数量都有效`);
  }

  // ============================================================
  // 7. 采样验证
  // ============================================================
  console.log('\n' + '═'.repeat(60));
  console.log('【7】采样验证 (10 条随机记录)');
  console.log('═'.repeat(60));

  const samples = db.prepare(`
    SELECT 
      pt.id,
      p1.drawing_number as parent_dn,
      p2.drawing_number as child_dn,
      pt.quantity,
      p1.is_assembly as parent_assembly,
      p2.is_assembly as child_assembly
    FROM part_tree pt
    JOIN part p1 ON pt.parent_id = p1.id
    JOIN part p2 ON pt.child_id = p2.id
    ORDER BY RANDOM()
    LIMIT 10
  `).all();

  console.log();
  samples.forEach((sample, index) => {
    const parentLabel = sample.parent_assembly === 1 ? '[A]' : '[P]';
    const childLabel = sample.child_assembly === 1 ? '[A]' : '[P]';
    console.log(`${index + 1}. ${sample.parent_dn} ${parentLabel}`);
    console.log(`   ↓ qty: ${sample.quantity}`);
    console.log(`   ${sample.child_dn} ${childLabel}\n`);
  });

  // ============================================================
  // 8. 深度结构检查
  // ============================================================
  console.log('═'.repeat(60));
  console.log('【8】BOM 深度分析');
  console.log('═'.repeat(60));

  // 找出最深的层级
  const maxDepth = db.prepare(`
    WITH RECURSIVE bom_depth AS (
      SELECT parent_id, child_id, 1 as depth
      FROM part_tree
      UNION ALL
      SELECT pt.parent_id, pt.child_id, bd.depth + 1
      FROM part_tree pt
      JOIN bom_depth bd ON pt.parent_id = bd.child_id
      WHERE bd.depth < 100
    )
    SELECT MAX(depth) as max_depth FROM bom_depth
  `).get().max_depth;

  console.log(`\n- 最大 BOM 深度: ${maxDepth || 1} 层`);

  // 统计各层的零件数
  const depthStats = db.prepare(`
    WITH RECURSIVE part_depth AS (
      SELECT id, 0 as depth FROM part
      WHERE NOT EXISTS (SELECT 1 FROM part_tree WHERE child_id = part.id)
      UNION ALL
      SELECT pt.parent_id, pd.depth + 1
      FROM part_tree pt
      JOIN part_depth pd ON pt.child_id = pd.id
      WHERE pd.depth < 100
    )
    SELECT depth, COUNT(DISTINCT id) as cnt
    FROM part_depth
    GROUP BY depth
    ORDER BY depth
  `).all();

  if (depthStats.length > 0) {
    console.log(`\n零件层级分布:`);
    depthStats.slice(0, 5).forEach(row => {
      console.log(`  - 深度 ${row.depth}: ${row.cnt} 个零件`);
    });
    if (depthStats.length > 5) {
      console.log(`  ... 共 ${depthStats.length} 层`);
    }
  }

  // ============================================================
  // 最终总结
  // ============================================================
  console.log('\n' + '═'.repeat(60));
  console.log('【验证总结】');
  console.log('═'.repeat(60));

  const allChecks = [
    ['part 表记录数', partCount === 1657, `${partCount} (预期 1657)`],
    ['part_tree 表记录数', partTreeCount === 1460, `${partTreeCount} (预期 1460)`],
    ['is_assembly 标记', withGANotAssembly === 0, `-GA- 标记正确率 100%`],
    ['外键完整性', orphanParents === 0 && orphanChildren === 0, `无孤立记录`],
    ['自引用', selfRefs === 0, `无自引用`],
    ['UNIQUE 约束', duplicates.length === 0, `无重复`],
    ['数量有效性', quantityStats.invalid_qty === 0, `所有数量 > 0`]
  ];

  console.log();
  allChecks.forEach(check => {
    const status = check[1] ? '✅' : '⚠️ ';
    console.log(`${status} ${check[0]}: ${check[2]}`);
  });

  const allPassed = allChecks.every(c => c[1]);
  console.log(`\n${allPassed ? '🎉 所有检查通过！' : '⚠️  有检查未通过'}\n`);

} catch (error) {
  console.error('❌ 验证失败:', error.message);
  process.exit(1);
} finally {
  db.close();
}
