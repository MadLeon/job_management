/**
 * 迁移: 向 assembly_detail 表添加 unique_key 字段
 * name: 018_add_unique_key_to_assembly_detail
 * up: 添加 unique_key 字段
 * down: 移除 unique_key 字段
 */

export const name = '018_add_unique_key_to_assembly_detail';

/**
 * 向 assembly_detail 表添加 unique_key 字段
 * @param {import('better-sqlite3').Database} db
 */
export function up(db) {
  // 检查是否已存在 unique_key 字段
  const columns = db.pragma("table_info('assembly_detail')");
  if (!columns.some(col => col.name === 'unique_key')) {
    db.exec(`ALTER TABLE assembly_detail ADD COLUMN unique_key TEXT`);
  }
}

/**
 * 回滚: 移除 unique_key 字段（SQLite 不支持直接删除列，需重建表）
 * @param {import('better-sqlite3').Database} db
 */
export function down(db) {
  const columns = db.pragma("table_info('assembly_detail')");
  if (columns.some(col => col.name === 'unique_key')) {
    // 1. 创建临时表（不含 unique_key）
    db.exec(`CREATE TABLE assembly_detail_tmp AS SELECT id, part_number, drawing_number, quantity, status, file_location, delivery_required_date, delivery_required_date_old, created_at, updated_at FROM assembly_detail`);
    // 2. 删除原表
    db.exec(`DROP TABLE assembly_detail`);
    // 3. 重建原表结构（不含 unique_key）
    db.exec(`CREATE TABLE assembly_detail (
      id INTEGER PRIMARY KEY,
      part_number TEXT,
      drawing_number TEXT,
      quantity TEXT,
      status TEXT,
      file_location TEXT,
      delivery_required_date TEXT,
      delivery_required_date_old TEXT,
      created_at TEXT,
      updated_at TEXT
    )`);
    // 4. 导回数据
    db.exec(`INSERT INTO assembly_detail SELECT * FROM assembly_detail_tmp`);
    // 5. 删除临时表
    db.exec(`DROP TABLE assembly_detail_tmp`);
  }
}
