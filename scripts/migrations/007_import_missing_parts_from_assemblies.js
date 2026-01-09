/**
 * 迁移 007: 从 jobs.db assemblies 表导入缺失的零件到 part 表
 * 
 * 这个迁移执行以下步骤：
 * 1. 从 assemblies 表中提取所有唯一的 part_number 和 drawing_number
 * 2. 检查这些零件是否已存在于 part 表中
 * 3. 对于缺失的零件，创建新的 part 记录
 *    - part_number: is_assembly = 1
 *    - drawing_number: is_assembly = 1 (if contains -GA-) else 0
 * 4. 避免重复插入（既是 part_number 又是 drawing_number 的情况）
 * 
 * 预期导入约 1369 条新零件
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const name = '007_import_missing_parts_from_assemblies';

export function up(db) {
  const projectRoot = process.cwd();
  const oldDbPath = path.join(projectRoot, 'data', 'jobs.db');

  // 打开源数据库（只读）
  const oldDb = new Database(oldDbPath, { readonly: true });

  const stats = {
    partNumbersProcessed: 0,
    partNumbersInserted: 0,
    drawingNumbersProcessed: 0,
    drawingNumbersInserted: 0,
    skipped: 0,
    errors: []
  };

  console.log('📚 [007 迁移] 从 assemblies 导入缺失零件开始...');
  console.log(`  源数据库: ${oldDbPath}`);
  console.log('');

  try {
    // ============================================================
    // 第一步：从 assemblies 提取所有唯一的零件号
    // ============================================================
    console.log('【1】从 assemblies 提取零件号...');

    const allPartNumbers = new Set();
    const allDrawingNumbers = new Set();

    oldDb.prepare("SELECT DISTINCT part_number FROM assemblies WHERE part_number IS NOT NULL AND part_number != ''")
      .all()
      .forEach(row => {
        allPartNumbers.add(row.part_number);
      });

    oldDb.prepare("SELECT DISTINCT drawing_number FROM assemblies WHERE drawing_number IS NOT NULL AND drawing_number != ''")
      .all()
      .forEach(row => {
        allDrawingNumbers.add(row.drawing_number);
      });

    console.log(`  ✓ 提取了 ${allPartNumbers.size} 个 part_number`);
    console.log(`  ✓ 提取了 ${allDrawingNumbers.size} 个 drawing_number`);

    // ============================================================
    // 第二步：加载 part 表现有数据
    // ============================================================
    console.log('\n【2】加载现有 part 表数据...');

    const existingParts = new Map();
    db.prepare('SELECT id, drawing_number FROM part')
      .all()
      .forEach(row => {
        existingParts.set(row.drawing_number, row.id);
      });

    console.log(`  ✓ 加载了 ${existingParts.size} 条现有 part 记录`);

    // ============================================================
    // 第三步：处理 part_number（全部是 assembly）
    // ============================================================
    console.log('\n【3】处理 part_number...');

    const insertPartStmt = db.prepare(`
      INSERT INTO part (drawing_number, revision, description, is_assembly)
      VALUES (?, ?, ?, ?)
    `);

    allPartNumbers.forEach(partNumber => {
      stats.partNumbersProcessed++;

      // 检查是否已存在
      if (existingParts.has(partNumber)) {
        stats.skipped++;
        return;
      }

      try {
        // 获取 description（从 assemblies 中）
        const description = oldDb.prepare(
          "SELECT description FROM assemblies WHERE part_number = ? LIMIT 1"
        ).get(partNumber)?.description || null;

        insertPartStmt.run(
          partNumber,        // drawing_number
          '-',               // revision (default)
          description,       // description
          1                  // is_assembly = 1 (part_number 都是总装件)
        );

        stats.partNumbersInserted++;
        existingParts.set(partNumber, null); // 标记为已处理
      } catch (error) {
        stats.errors.push(`无法插入 part_number ${partNumber}: ${error.message}`);
      }
    });

    console.log(`  ✓ 处理了 ${stats.partNumbersProcessed} 个 part_number`);
    console.log(`  ✓ 新增了 ${stats.partNumbersInserted} 条 part 记录`);
    if (stats.skipped > 0) {
      console.log(`  ✓ 跳过了 ${stats.skipped} 个已存在的记录`);
    }

    // ============================================================
    // 第四步：处理 drawing_number（根据 -GA- 判断 is_assembly）
    // ============================================================
    console.log('\n【4】处理 drawing_number...');

    let drawingWithGA = 0;
    let drawingWithoutGA = 0;

    allDrawingNumbers.forEach(drawingNumber => {
      stats.drawingNumbersProcessed++;

      // 检查是否已存在
      if (existingParts.has(drawingNumber)) {
        stats.skipped++;
        return;
      }

      try {
        // 获取 description（从 assemblies 中）
        const description = oldDb.prepare(
          "SELECT description FROM assemblies WHERE drawing_number = ? LIMIT 1"
        ).get(drawingNumber)?.description || null;

        // 根据 -GA- 判断 is_assembly
        const isAssembly = drawingNumber.includes('-GA-') ? 1 : 0;

        insertPartStmt.run(
          drawingNumber,     // drawing_number
          '-',               // revision (default)
          description,       // description
          isAssembly         // is_assembly: 1 if -GA-, else 0
        );

        stats.drawingNumbersInserted++;
        if (isAssembly === 1) {
          drawingWithGA++;
        } else {
          drawingWithoutGA++;
        }
      } catch (error) {
        stats.errors.push(`无法插入 drawing_number ${drawingNumber}: ${error.message}`);
      }
    });

    console.log(`  ✓ 处理了 ${stats.drawingNumbersProcessed} 个 drawing_number`);
    console.log(`    - 含 -GA- (is_assembly=1): ${drawingWithGA} 个`);
    console.log(`    - 不含 -GA- (is_assembly=0): ${drawingWithoutGA} 个`);
    console.log(`  ✓ 新增了 ${stats.drawingNumbersInserted} 条 part 记录`);

    // ============================================================
    // 生成迁移报告
    // ============================================================
    console.log('\n' + '═'.repeat(60));
    console.log('【迁移总结】');
    console.log('═'.repeat(60));

    const totalInserted = stats.partNumbersInserted + stats.drawingNumbersInserted;
    const totalProcessed = stats.partNumbersProcessed + stats.drawingNumbersProcessed;

    console.log(`\n处理的零件总数: ${totalProcessed}`);
    console.log(`  - part_number: ${stats.partNumbersProcessed} 个`);
    console.log(`  - drawing_number: ${stats.drawingNumbersProcessed} 个`);
    console.log(`\n新增的零件: ${totalInserted}`);
    console.log(`  - 来自 part_number: ${stats.partNumbersInserted} 个`);
    console.log(`  - 来自 drawing_number: ${stats.drawingNumbersInserted} 个`);
    console.log(`\n跳过的记录（已存在）: ${stats.skipped} 个`);

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
    throw new Error(`迁移 007 失败: ${error.message}`);
  } finally {
    oldDb.close();
  }
}

export function down(db) {
  // 回滚：删除从 assemblies 导入的零件
  // 因为这些零件的 previous_id 和 next_id 都是 NULL
  // 我们可以通过这个特征来识别并删除它们
  // 但为了安全起见，我们只删除那些没有被关联的零件

  console.log('📚 [007 回滚] 删除导入的缺失零件...');

  try {
    // 统计将被删除的零件
    const count = db.prepare(`
      SELECT COUNT(*) as cnt FROM part 
      WHERE previous_id IS NULL AND next_id IS NULL
    `).get().cnt;

    console.log(`  ⚠️  这个操作比较复杂，因为无法准确识别哪些是导入的零件`);
    console.log(`  - 目前有 ${count} 个零件没有 previous/next 关联`);
    console.log(`  - 建议手动验证或恢复数据库备份`);

  } catch (error) {
    throw new Error(`回滚 007 失败: ${error.message}`);
  }
}
