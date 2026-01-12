/**
 * 迁移012：批量更新drawing_file表的part_id
 * 
 * 逻辑：
 * 1. 遍历所有order_item记录
 * 2. 对每个part，使用match-part-drawing脚本进行匹配
 * 3. 成功匹配时，更新drawing_file的part_id
 * 4. 统计匹配结果
 * 
 * 执行: npm run db:migrate
 */

import { matchPartToDrawing, getCustomerIdFromOrderItem } from '../match-part-drawing.js';

export const name = '012_populate_drawing_file_part_id';

export function up(db) {
  console.log(`\n⚙️  执行迁移: ${name}`);
  console.log('=' .repeat(60));

  // 统计信息
  const stats = {
    processed_parts: 0,
    matched: 0,
    skipped_already_has_id: 0,
    failed_to_match: 0,
    updated_drawing_files: 0
  };

  try {
    // step 1: 获取所有order_item
    const orderItems = db.prepare(`
      SELECT DISTINCT oi.id, oi.part_id, p.drawing_number
      FROM order_item oi
      JOIN part p ON oi.part_id = p.id
      ORDER BY oi.id
    `).all();

    console.log(`\n📊 开始处理 ${orderItems.length} 个order_item...`);

    // step 2: 遍历每个order_item进行匹配
    for (const orderItem of orderItems) {
      const { id: order_item_id, part_id, drawing_number } = orderItem;

      stats.processed_parts++;

      // 检查该part在drawing_file中是否已有part_id
      const existingDrawingFile = db.prepare(`
        SELECT COUNT(*) as count
        FROM drawing_file
        WHERE part_id = ?
        LIMIT 1
      `).get(part_id);

      if (existingDrawingFile.count > 0) {
        stats.skipped_already_has_id++;
        continue;
      }

      // 获取customer_id
      const customer_id = getCustomerIdFromOrderItem(db, order_item_id);

      // 获取完整的part信息
      const part = db.prepare(`
        SELECT id, drawing_number, revision
        FROM part
        WHERE id = ?
      `).get(part_id);

      // 执行匹配
      const matchResult = matchPartToDrawing(db, part, customer_id);

      if (!matchResult.success || !matchResult.file_id) {
        stats.failed_to_match++;
        continue;
      }

      // step 3: 更新drawing_file的part_id
      try {
        db.prepare(`
          UPDATE drawing_file
          SET part_id = ?, updated_at = datetime('now', 'localtime')
          WHERE id = ?
        `).run(part_id, matchResult.file_id);

        stats.matched++;
        stats.updated_drawing_files++;
      } catch (updateError) {
        console.error(`❌ 更新drawing_file失败 (id=${matchResult.file_id}):`, updateError.message);
        stats.failed_to_match++;
      }
    }

    // step 4: 统计报告
    console.log('\n' + '='.repeat(60));
    console.log('📋 匹配统计报告:');
    console.log(`   已处理order_item: ${stats.processed_parts}`);
    console.log(`   成功匹配: ${stats.matched}`);
    console.log(`   跳过（已有part_id）: ${stats.skipped_already_has_id}`);
    console.log(`   无法匹配: ${stats.failed_to_match}`);
    console.log(`   更新drawing_file记录: ${stats.updated_drawing_files}`);
    console.log(`   成功率: ${stats.processed_parts > 0 ? ((stats.matched / (stats.processed_parts - stats.skipped_already_has_id)) * 100).toFixed(2) : 0}%`);
    console.log('='.repeat(60));

    console.log(`\n✓ 迁移 ${name} 成功完成！`);
  } catch (error) {
    console.error(`\n❌ 迁移 ${name} 失败:`, error.message);
    throw error;
  }
}

export function down(db) {
  console.log(`\n⚙️  回滚迁移: ${name}`);
  console.log('=' .repeat(60));

  try {
    // 回滚：将drawing_file中的part_id重置为NULL
    // 但只重置那些在迁移012之后被新增的映射
    // 为了安全起见，我们只重置那些file_name能被匹配到drawing_number的记录
    const result = db.prepare(`
      UPDATE drawing_file
      SET part_id = NULL, updated_at = datetime('now', 'localtime')
      WHERE part_id IS NOT NULL
      AND id IN (
        SELECT df.id
        FROM drawing_file df
        JOIN part p ON df.part_id = p.id
        WHERE df.file_name LIKE '%' || p.drawing_number || '%'
      )
    `).run();

    console.log(`   重置了 ${result.changes} 条drawing_file记录的part_id`);
    console.log(`\n✓ 回滚 ${name} 成功完成！`);
  } catch (error) {
    console.error(`\n❌ 回滚 ${name} 失败:`, error.message);
    throw error;
  }
}

/**
 * 独立测试入口
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  import('better-sqlite3').then(m => {
    const Database = m.default;
    const dbPath = new URL('../../data/record.db', import.meta.url).pathname.slice(1);
    const db = new Database(dbPath);

    console.log('=== 迁移脚本 012 测试模式 ===\n');

    try {
      up(db);
      console.log('\n✅ 测试完成');
    } catch (error) {
      console.error('❌ 测试失败:', error);
      process.exit(1);
    } finally {
      db.close();
    }
  });
}
