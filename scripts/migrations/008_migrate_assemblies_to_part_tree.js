/**
 * 迁移 008: 从 jobs.db assemblies 表迁移关系到 part_tree 表
 * 
 * 这个迁移执行以下步骤：
 * 1. 遍历 assemblies 表的所有记录
 * 2. 对于每条记录：
 *    - 查询 part_number 对应的 part.id 作为 parent_id
 *    - 查询 drawing_number 对应的 part.id 作为 child_id
 *    - 检查是否是自引用（跳过）
 *    - 检查是否已存在（由于 UNIQUE 约束，跳过）
 *    - 插入到 part_tree 表
 * 3. 处理 quantity：空字符串或 NULL 默认为 1
 * 
 * 预期迁移约 1499 条关系记录
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const name = '008_migrate_assemblies_to_part_tree';

export function up(db) {
  const projectRoot = process.cwd();
  const oldDbPath = path.join(projectRoot, 'data', 'jobs.db');

  // 打开源数据库（只读）
  const oldDb = new Database(oldDbPath, { readonly: true });

  const stats = {
    totalRecords: 0,
    successInserted: 0,
    selfRefSkipped: 0,
    parentNotFound: 0,
    childNotFound: 0,
    duplicateSkipped: 0,
    errors: []
  };

  console.log('📚 [008 迁移] 从 assemblies 迁移关系到 part_tree 开始...');
  console.log(`  源数据库: ${oldDbPath}`);
  console.log('');

  try {
    // ============================================================
    // 第一步：加载 part 表数据用于快速查询
    // ============================================================
    console.log('【1】加载 part 表数据...');

    const partByDrawingNumber = new Map();
    db.prepare('SELECT id, drawing_number FROM part')
      .all()
      .forEach(row => {
        partByDrawingNumber.set(row.drawing_number, row.id);
      });

    console.log(`  ✓ 加载了 ${partByDrawingNumber.size} 条 part 记录`);

    // ============================================================
    // 第二步：读取 assemblies 数据
    // ============================================================
    console.log('\n【2】读取 assemblies 数据...');

    const assemblies = oldDb.prepare(`
      SELECT part_number, drawing_number, quantity
      FROM assemblies
      WHERE part_number IS NOT NULL AND drawing_number IS NOT NULL
    `).all();

    stats.totalRecords = assemblies.length;
    console.log(`  ✓ 读取了 ${stats.totalRecords} 条 assemblies 记录`);

    // ============================================================
    // 第三步：准备插入语句
    // ============================================================
    const insertPartTreeStmt = db.prepare(`
      INSERT INTO part_tree (parent_id, child_id, quantity)
      VALUES (?, ?, ?)
    `);

    const getPartTreeStmt = db.prepare(`
      SELECT id FROM part_tree
      WHERE parent_id = ? AND child_id = ?
    `);

    // ============================================================
    // 第四步：迁移 assemblies 关系
    // ============================================================
    console.log('\n【3】迁移关系记录...');

    assemblies.forEach((record, index) => {
      const parentId = partByDrawingNumber.get(record.part_number);
      const childId = partByDrawingNumber.get(record.drawing_number);

      // 检查自引用
      if (record.part_number === record.drawing_number) {
        stats.selfRefSkipped++;
        return;
      }

      // 检查 parent_id 是否存在
      if (!parentId) {
        stats.parentNotFound++;
        return;
      }

      // 检查 child_id 是否存在
      if (!childId) {
        stats.childNotFound++;
        return;
      }

      // 检查是否已存在（UNIQUE 约束）
      if (getPartTreeStmt.get(parentId, childId)) {
        stats.duplicateSkipped++;
        return;
      }

      try {
        // 处理 quantity：空字符串或非数字默认为 1
        let quantity = 1;
        if (record.quantity && record.quantity !== '') {
          const parsed = parseInt(record.quantity);
          if (!isNaN(parsed) && parsed > 0) {
            quantity = parsed;
          }
        }

        insertPartTreeStmt.run(parentId, childId, quantity);
        stats.successInserted++;

        // 进度显示
        if ((index + 1) % 100 === 0) {
          console.log(`  ... 已处理 ${index + 1}/${stats.totalRecords} 条`);
        }
      } catch (error) {
        stats.errors.push(`无法插入 (${record.part_number} → ${record.drawing_number}): ${error.message}`);
      }
    });

    // ============================================================
    // 生成迁移报告
    // ============================================================
    console.log('\n' + '═'.repeat(60));
    console.log('【迁移总结】');
    console.log('═'.repeat(60));

    console.log(`\n总处理记录: ${stats.totalRecords}`);
    console.log(`  ✅ 成功迁移: ${stats.successInserted} 条`);
    console.log(`  ⊘ 自引用跳过: ${stats.selfRefSkipped} 条`);
    console.log(`  ⊘ parent 找不到: ${stats.parentNotFound} 条`);
    console.log(`  ⊘ child 找不到: ${stats.childNotFound} 条`);
    console.log(`  ⊘ 重复跳过: ${stats.duplicateSkipped} 条`);

    const totalSkipped = stats.selfRefSkipped + stats.parentNotFound + stats.childNotFound + stats.duplicateSkipped;
    console.log(`\n总跳过: ${totalSkipped} 条`);
    console.log(`成功率: ${((stats.successInserted / stats.totalRecords) * 100).toFixed(2)}%`);

    if (stats.errors.length > 0) {
      console.log(`\n⚠️  错误: ${stats.errors.length} 条`);
      stats.errors.slice(0, 5).forEach(err => {
        console.log(`  - ${err}`);
      });
      if (stats.errors.length > 5) {
        console.log(`  ... 以及其他 ${stats.errors.length - 5} 个错误`);
      }
    } else {
      console.log(`\n✅ 无错误`);
    }

    console.log('');

  } catch (error) {
    oldDb.close();
    throw new Error(`迁移 008 失败: ${error.message}`);
  } finally {
    oldDb.close();
  }
}

export function down(db) {
  console.log('📚 [008 回滚] 删除迁移的关系...');

  try {
    // 不能准确识别哪些是导入的，所以采用保守策略
    // 只删除满足特定条件的记录

    const count = db.prepare(`
      DELETE FROM part_tree
      WHERE parent_id IN (
        SELECT DISTINCT p.id FROM part p
        WHERE p.previous_id IS NULL AND p.next_id IS NULL
      )
    `).changes;

    console.log(`  ⚠️  删除了 ${count} 条关系记录（可能不准确）`);
    console.log(`  建议手动验证或恢复数据库备份`);

  } catch (error) {
    throw new Error(`回滚 008 失败: ${error.message}`);
  }
}
