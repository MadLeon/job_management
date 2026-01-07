/**
 * 迁移 002: 创建零件管理表
 * 
 * 创建以下表:
 * - part (零件主表)
 * - part_tree (BOM 表)
 * - drawing_file (图纸文件表)
 * - part_attachment (零件附件表)
 */

export const name = '002_create_part_tables';

export function up(db) {
  // =====================================================
  // 1. part - 零件主表（优化版）
  // =====================================================
  db.exec(`
    CREATE TABLE part (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      previous_id INTEGER,
      next_id INTEGER,
      drawing_number TEXT NOT NULL,
      revision TEXT NOT NULL DEFAULT '-',
      description TEXT,
      is_assembly INTEGER DEFAULT 0,
      production_count INTEGER DEFAULT 0,
      total_production_hour REAL DEFAULT 0,
      total_administrative_hour REAL DEFAULT 0,
      unit_price REAL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (previous_id) REFERENCES part(id) ON DELETE SET NULL,
      FOREIGN KEY (next_id) REFERENCES part(id) ON DELETE SET NULL,
      UNIQUE(drawing_number, revision)
    );
  `);

  // =====================================================
  // 2. part_tree - BOM 表
  // =====================================================
  db.exec(`
    CREATE TABLE part_tree (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER NOT NULL,
      child_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (parent_id) REFERENCES part(id) ON DELETE CASCADE,
      FOREIGN KEY (child_id) REFERENCES part(id),
      UNIQUE(parent_id, child_id)
    );
  `);

  // =====================================================
  // 3. drawing_file - 图纸文件表
  // =====================================================
  db.exec(`
    CREATE TABLE drawing_file (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      part_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL UNIQUE,
      is_active INTEGER DEFAULT 1,
      last_modified_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (part_id) REFERENCES part(id) ON DELETE CASCADE
    );
  `);

  // =====================================================
  // 4. part_attachment - 零件附件表（优化版）
  // =====================================================
  db.exec(`
    CREATE TABLE part_attachment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      part_id INTEGER,
      order_item_id INTEGER,
      file_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL UNIQUE,
      is_active INTEGER DEFAULT 1,
      last_modified_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (part_id) REFERENCES part(id) ON DELETE CASCADE,
      FOREIGN KEY (order_item_id) REFERENCES order_item(id) ON DELETE CASCADE,
      CHECK (part_id IS NOT NULL OR order_item_id IS NOT NULL)
    );
  `);
}

export function down(db) {
  db.exec('DROP TABLE IF EXISTS part_attachment;');
  db.exec('DROP TABLE IF EXISTS drawing_file;');
  db.exec('DROP TABLE IF EXISTS part_tree;');
  db.exec('DROP TABLE IF EXISTS part;');
}
