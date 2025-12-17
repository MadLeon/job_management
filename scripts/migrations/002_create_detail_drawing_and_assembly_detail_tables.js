/**
 * 迁移: 002_create_detail_drawing_and_assembly_detail_tables
 * 创建 detail_drawing 表（存储图纸元数据）
 * 创建 assembly_detail 表（存储装配详情，用于详情行渲染）
 */

export const name = '002_create_detail_drawing_and_assembly_detail_tables';

export function up(db) {
  // 创建 detail_drawing 表
  const detailDrawingExists = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='detail_drawing'"
  ).get();

  if (!detailDrawingExists) {
    db.exec(`
      CREATE TABLE detail_drawing (
        drawing_id INTEGER PRIMARY KEY AUTOINCREMENT,
        drawing_number TEXT UNIQUE,
        description TEXT,
        revision TEXT,
        isAssembly INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime'))
      );
    `);
    console.log('✓ 创建 detail_drawing 表');
  } else {
    console.log('⊘ detail_drawing 表已存在');
  }

  // 创建 assembly_detail 表
  const assemblyDetailExists = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='assembly_detail'"
  ).get();

  if (!assemblyDetailExists) {
    db.exec(`
      CREATE TABLE assembly_detail (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        part_number TEXT,
        drawing_number TEXT,
        quantity TEXT,
        status TEXT,
        file_location TEXT,
        delivery_required_date TEXT,
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime'))
      );
    `);
    console.log('✓ 创建 assembly_detail 表');
  } else {
    console.log('⊘ assembly_detail 表已存在');
  }
}

export function down(db) {
  db.exec(`DROP TABLE IF EXISTS assembly_detail`);
  db.exec(`DROP TABLE IF EXISTS detail_drawing`);
  console.log('✓ 删除 detail_drawing 和 assembly_detail 表');
}
