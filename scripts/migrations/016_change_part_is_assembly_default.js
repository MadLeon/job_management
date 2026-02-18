/**
 * 迁移 016: 修改 part 表的 is_assembly 字段默认值
 * 
 * 将 is_assembly 字段的默认值从 DEFAULT 0 改为 DEFAULT NULL
 * 使用 SQLite 的"创建新表 → 复制数据 → 删除旧表 → 重命名"模式
 */

export const name = '016_change_part_is_assembly_default';

export function up(db) {
  // =====================================================
  // 0. 禁用外键检查（因为会删除和重建 part 表）
  // =====================================================
  db.exec('PRAGMA foreign_keys = OFF;');

  // =====================================================
  // 1. 创建临时表（新的表结构，DEFAULT NULL）
  // =====================================================
  db.exec(`
    CREATE TABLE part_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      previous_id INTEGER,
      next_id INTEGER,
      drawing_number TEXT NOT NULL,
      revision TEXT NOT NULL DEFAULT '-',
      description TEXT,
      is_assembly INTEGER DEFAULT NULL,
      production_count INTEGER DEFAULT 0,
      total_production_hour REAL DEFAULT 0,
      total_administrative_hour REAL DEFAULT 0,
      unit_price REAL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (previous_id) REFERENCES part_new(id) ON DELETE SET NULL,
      FOREIGN KEY (next_id) REFERENCES part_new(id) ON DELETE SET NULL,
      UNIQUE(drawing_number, revision)
    );
  `);

  // =====================================================
  // 2. 复制旧表数据到新表
  // =====================================================
  db.exec(`
    INSERT INTO part_new (id, previous_id, next_id, drawing_number, revision, description, is_assembly, production_count, total_production_hour, total_administrative_hour, unit_price, created_at, updated_at)
    SELECT id, previous_id, next_id, drawing_number, revision, description, is_assembly, production_count, total_production_hour, total_administrative_hour, unit_price, created_at, updated_at
    FROM part;
  `);

  // =====================================================
  // 3. 删除旧表
  // =====================================================
  db.exec('DROP TABLE part;');

  // =====================================================
  // 4. 重命名新表为旧表名
  // =====================================================
  db.exec('ALTER TABLE part_new RENAME TO part;');

  // =====================================================
  // 5. 重建依赖部分表的外键
  // =====================================================
  // part_tree 仍然引用 part，无需修改
  // drawing_file 仍然引用 part，无需修改
  // part_attachment 仍然引用 part，无需修改
  // order_item 仍然引用 part，无需修改

  // =====================================================
  // 6. 重新启用外键检查
  // =====================================================
  db.exec('PRAGMA foreign_keys = ON;');
}

export function down(db) {
  // =====================================================
  // 0. 禁用外键检查（因为会删除和重建 part 表）
  // =====================================================
  db.exec('PRAGMA foreign_keys = OFF;');

  // =====================================================
  // 1. 创建临时表（恢复旧表结构，DEFAULT 0）
  // =====================================================
  db.exec(`
    CREATE TABLE part_new (
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
      FOREIGN KEY (previous_id) REFERENCES part_new(id) ON DELETE SET NULL,
      FOREIGN KEY (next_id) REFERENCES part_new(id) ON DELETE SET NULL,
      UNIQUE(drawing_number, revision)
    );
  `);

  // =====================================================
  // 2. 复制表数据到临时表
  // =====================================================
  db.exec(`
    INSERT INTO part_new (id, previous_id, next_id, drawing_number, revision, description, is_assembly, production_count, total_production_hour, total_administrative_hour, unit_price, created_at, updated_at)
    SELECT id, previous_id, next_id, drawing_number, revision, description, is_assembly, production_count, total_production_hour, total_administrative_hour, unit_price, created_at, updated_at
    FROM part;
  `);

  // =====================================================
  // 3. 删除原表
  // =====================================================
  db.exec('DROP TABLE part;');

  // =====================================================
  // 4. 重命名临时表
  // =====================================================
  db.exec('ALTER TABLE part_new RENAME TO part;');

  // =====================================================
  // 5. 重新启用外键检查
  // =====================================================
  db.exec('PRAGMA foreign_keys = ON;');
}
