/**
 * 迁移: 017_add_updated_at_to_drawings
 * 为 drawings 表添加 updated_at 列用于时间戳排序
 * 字段类型: TEXT (ISO 8601)
 * 默认值: CURRENT_TIMESTAMP（仅对新增记录生效）
 *
 * @module scripts/migrations/017_add_updated_at_to_drawings
 */

export const name = '017_add_updated_at_to_drawings';

/**
 * 应用迁移：在 drawings 表添加 updated_at 列
 * @param {import('better-sqlite3').Database} db - SQLite 数据库实例
 */
export function up(db) {
  // 检查列是否已存在
  const columns = db.pragma('table_info(drawings)');
  const hasColumn = columns.some(col => col.name === 'updated_at');

  if (!hasColumn) {
    // SQLite 限制：ALTER TABLE ADD COLUMN 不允许使用非常量默认值
    // 方案：添加可空列 + 触发器在插入/更新时设置 CURRENT_TIMESTAMP
    db.exec(`
      ALTER TABLE drawings ADD COLUMN updated_at TEXT;
    `);
    console.log('✓ 为 drawings 表添加 updated_at 列 (TEXT)');

    // 插入触发器：在插入记录且未提供 updated_at 时自动填充当前时间
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS drawings_set_updated_at_insert
      AFTER INSERT ON drawings
      FOR EACH ROW
      WHEN NEW.updated_at IS NULL
      BEGIN
        UPDATE drawings
        SET updated_at = CURRENT_TIMESTAMP
        WHERE rowid = NEW.rowid;
      END;
    `);
    console.log('✓ 创建插入触发器 drawings_set_updated_at_insert');

    // 更新触发器：任何对记录的更新将刷新 updated_at
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS drawings_set_updated_at_update
      AFTER UPDATE ON drawings
      FOR EACH ROW
      BEGIN
        UPDATE drawings
        SET updated_at = CURRENT_TIMESTAMP
        WHERE rowid = NEW.rowid;
      END;
    `);
    console.log('✓ 创建更新触发器 drawings_set_updated_at_update');
  } else {
    console.log('⊘ drawings.updated_at 列已存在，跳过');
  }
}

/**
 * 回滚迁移：删除 drawings.updated_at 列
 * @param {import('better-sqlite3').Database} db - SQLite 数据库实例
 */
export function down(db) {
  // 先删除触发器
  db.exec('DROP TRIGGER IF EXISTS drawings_set_updated_at_insert;');
  db.exec('DROP TRIGGER IF EXISTS drawings_set_updated_at_update;');
  console.log('✓ 删除 drawings 表的 updated_at 相关触发器');

  // 再删除列
  db.exec('ALTER TABLE drawings DROP COLUMN updated_at');
  console.log('✓ 删除 drawings 表的 updated_at 列');
}
