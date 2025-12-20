/**
 * 迁移 012：验证所有装配件都包含自身引用（可选清理）
 * 
 * @description
 * 这是一个验证和清理迁移。检查所有被标记为装配的图纸是否都在
 * assembly_detail中有自身引用（part_number = drawing_number = 图纸号）。
 * 如果有缺失的，添加它们。
 * 
 * @date 2025-12-19
 */

export const name = '012_verify_and_fix_assembly_self_reference';

/**
 * 升级迁移：验证和修复装配件自身引用
 * @param {Database} db - better-sqlite3数据库实例
 */
export function up(db) {
  try {
    console.log('开始迁移 012: 验证装配件自身引用...');

    // 获取所有被标记为装配的图纸
    const assemblyDrawings = db.prepare(`
      SELECT drawing_number, description
      FROM detail_drawing
      WHERE isAssembly = 1
    `).all();

    console.log(`找到 ${assemblyDrawings.length} 个被标记为装配的图纸`);

    // 插入语句
    const insertSelfRef = db.prepare(`
      INSERT OR IGNORE INTO assembly_detail 
      (part_number, drawing_number, quantity, status, created_at, updated_at)
      VALUES (?, ?, '1', 'Pending', datetime('now','localtime'), datetime('now','localtime'))
    `);

    let addedCount = 0;
    let existsCount = 0;

    // 检查每个装配图纸是否有自身引用
    for (const drawing of assemblyDrawings) {
      const drawingNumber = drawing.drawing_number;

      // 检查是否存在
      const exists = db.prepare(`
        SELECT COUNT(*) as cnt
        FROM assembly_detail
        WHERE part_number = ? AND drawing_number = ?
      `).get(drawingNumber, drawingNumber);

      if (exists.cnt > 0) {
        existsCount++;
      } else {
        // 添加自身引用
        const result = insertSelfRef.run(drawingNumber, drawingNumber);
        if (result.changes > 0) {
          addedCount++;
        }
      }
    }

    console.log(`✓ 迁移完成:`);
    console.log(`  - 已存在的自身引用: ${existsCount}`);
    console.log(`  - 新添加的自身引用: ${addedCount}`);
  } catch (error) {
    console.error('✗ 迁移失败:', error);
    throw error;
  }
}

/**
 * 回滚迁移：删除通过本迁移添加的自身引用
 * @param {Database} db - better-sqlite3数据库实例
 */
export function down(db) {
  try {
    console.log('回滚迁移 012: 删除装配件自身引用...');

    // 删除那些part_number = drawing_number的记录
    const result = db.prepare(`
      DELETE FROM assembly_detail
      WHERE part_number = drawing_number
    `).run();

    console.log(`✓ 回滚完成: 删除 ${result.changes} 条自身引用记录`);
  } catch (error) {
    console.error('✗ 回滚失败:', error);
    throw error;
  }
}
