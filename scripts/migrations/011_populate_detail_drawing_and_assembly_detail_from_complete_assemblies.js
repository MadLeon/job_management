/**
 * 迁移 011：从完整的Assemblies表填充Detail_drawing和Assembly_detail表
 * 
 * @description
 * 第二步：现在Assemblies表已完整（包含所有Jobs中的装配件），
 * 使用它来初始化Detail_drawing和Assembly_detail表。
 * 
 * 流程：
 * 1. 从Assemblies表获取所有记录
 * 2. 对于每个记录，在Detail_drawing表中创建对应的条目
 *    - 使用'-GA-'逻辑判断isAssembly标志
 * 3. 在Assembly_detail表中创建对应的装配细节记录
 *    - 部分号 = part_number
 *    - 图纸号 = drawing_number
 *    - 自动创建每个装配件的自身引用
 * 
 * @date 2025-12-19
 */

export const name = '011_populate_detail_drawing_and_assembly_detail_from_complete_assemblies';

/**
 * 升级迁移：从完整的Assemblies表填充Detail_drawing和Assembly_detail
 * @param {Database} db - better-sqlite3数据库实例
 */
export function up(db) {
  try {
    console.log('开始迁移 011: 从完整的Assemblies表填充Detail_drawing和Assembly_detail...');

    // 第一步：识别所有应该在detail_drawing中的图纸
    // 包括：
    // 1. Assemblies表中的所有不同drawing_number
    // 2. 对于part_number包含'-GA-'的装配件，part_number本身也是一个图纸号

    const assemblyDrawingsFromTable = db.prepare(`
      SELECT DISTINCT drawing_number, description 
      FROM assemblies
    `).all();

    // 获取Jobs表中所有包含'-GA-'的装配件（这些是装配图纸）
    const assemblyPartsFromJobs = db.prepare(`
      SELECT DISTINCT part_number, part_description
      FROM jobs
      WHERE part_number LIKE '%GA%'
    `).all();

    console.log(`Assemblies表中的图纸: ${assemblyDrawingsFromTable.length}`);
    console.log(`Jobs表中的装配件: ${assemblyPartsFromJobs.length}`);

    // 合并所有需要在detail_drawing中的记录
    const allDrawings = new Map();

    // 添加来自Assemblies的
    for (const row of assemblyDrawingsFromTable) {
      allDrawings.set(row.drawing_number, {
        drawing_number: row.drawing_number,
        description: row.description,
        isAssembly: row.drawing_number.includes('-GA-') ? 1 : 0
      });
    }

    // 添加来自Jobs的装配件（这些也应该是图纸）
    for (const row of assemblyPartsFromJobs) {
      if (!allDrawings.has(row.part_number)) {
        allDrawings.set(row.part_number, {
          drawing_number: row.part_number,
          description: row.part_description,
          isAssembly: 1  // 显式标记为装配，因为它包含'-GA-'
        });
      }
    }

    // 2. 插入Detail_drawing表
    const insertDetailDrawing = db.prepare(`
      INSERT OR IGNORE INTO detail_drawing 
      (drawing_number, description, isAssembly, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now','localtime'), datetime('now','localtime'))
    `);

    let detailDrawingCount = 0;
    for (const [key, row] of allDrawings) {
      const result = insertDetailDrawing.run(
        row.drawing_number,
        row.description,
        row.isAssembly
      );
      if (result.changes > 0) {
        detailDrawingCount++;
      }
    }
    console.log(`✓ 插入 ${detailDrawingCount} 条Detail_drawing记录`);

    // 3. 从Assemblies表获取所有装配细节
    const allAssemblies = db.prepare(`
      SELECT part_number, drawing_number, quantity 
      FROM assemblies
    `).all();

    console.log(`Assemblies表中总的装配细节记录: ${allAssemblies.length}`);

    // 4. 插入Assembly_detail表
    const insertAssemblyDetail = db.prepare(`
      INSERT OR IGNORE INTO assembly_detail 
      (part_number, drawing_number, quantity, status, created_at, updated_at)
      VALUES (?, ?, ?, 'Pending', datetime('now','localtime'), datetime('now','localtime'))
    `);

    let assemblyDetailCount = 0;
    for (const row of allAssemblies) {
      const result = insertAssemblyDetail.run(
        row.part_number,
        row.drawing_number,
        row.quantity
      );
      if (result.changes > 0) {
        assemblyDetailCount++;
      }
    }
    console.log(`✓ 插入 ${assemblyDetailCount} 条Assembly_detail记录`);

    // 5. 为所有被标记为装配的图纸（isAssembly=1）添加自身引用
    // part_number = drawing_number
    console.log('\n添加自身引用（part_number = drawing_number）...');
    const assemblyDrawings = db.prepare(`
      SELECT drawing_number, description
      FROM detail_drawing
      WHERE isAssembly = 1
    `).all();

    console.log(`被标记为装配的图纸: ${assemblyDrawings.length}`);

    let selfRefCount = 0;
    for (const drawing of assemblyDrawings) {
      const drawingNumber = drawing.drawing_number;

      // 为每个装配图纸添加自身引用
      const result = insertAssemblyDetail.run(drawingNumber, drawingNumber, '1');
      if (result.changes > 0) {
        selfRefCount++;
      }
    }
    console.log(`✓ 添加 ${selfRefCount} 个自身引用`);

    console.log(`\n✓ 迁移 011 完成！`);
  } catch (error) {
    console.error('✗ 迁移失败:', error);
    throw error;
  }
}

/**
 * 回滚迁移：清空Detail_drawing和Assembly_detail表
 * @param {Database} db - better-sqlite3数据库实例
 */
export function down(db) {
  try {
    console.log('回滚迁移 011: 清空Detail_drawing和Assembly_detail表...');

    const result1 = db.prepare('DELETE FROM assembly_detail').run();
    const result2 = db.prepare('DELETE FROM detail_drawing').run();

    console.log(`✓ 回滚完成: 删除 ${result1.changes} 条Assembly_detail记录，${result2.changes} 条Detail_drawing记录`);
  } catch (error) {
    console.error('✗ 回滚失败:', error);
    throw error;
  }
}
