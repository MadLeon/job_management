/**
 * 迁移 017: 填充 part 表的 is_assembly 字段
 * 
 * 执行两个操作：
 * 1. 将 part ID >= 5253 的所有记录中，is_assembly 字段的值 0 改为 NULL
 * 2. 遍历 part 表，对所有以 "rt-"（不论大小写）开头，且 drawing_number 不包含 "-ga-" 的记录，
 *    将 is_assembly 设置为 0
 */

export const name = '017_populate_is_assembly_field';

export function up(db) {
  // =====================================================
  // 1. 将 id >= 5253 的所有 part 中，is_assembly = 0 改为 NULL
  // =====================================================
  db.exec(`
    UPDATE part
    SET is_assembly = NULL
    WHERE id >= 5253 AND is_assembly = 0;
  `);

  // =====================================================
  // 2. 将所有以 "rt-" 开头（不论大小写）且 drawing_number 不包含 "-ga-" 的记录，
  //    is_assembly 设置为 0
  // =====================================================
  db.exec(`
    UPDATE part
    SET is_assembly = 0
    WHERE LOWER(drawing_number) LIKE 'rt-%'
    AND LOWER(drawing_number) NOT LIKE '%' || '-ga-' || '%';
  `);
}

export function down(db) {
  // =====================================================
  // 回滚：将这些记录的 is_assembly 恢复为 0（或 NULL，取决于逻辑）
  // 为了完全回滚，我们只需要恢复到原始状态（都是 0）
  // =====================================================
  db.exec(`
    UPDATE part
    SET is_assembly = 0
    WHERE is_assembly IS NULL OR is_assembly = 0;
  `);
}
