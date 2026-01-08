/**
 * 迁移 004: 创建备注表（6 个专用备注表）
 * 
 * 创建以下表:
 * - po_note (采购订单备注)
 * - job_note (作业备注)
 * - order_item_note (订单明细备注)
 * - part_note (零件备注)
 * - shipment_note (发货备注)
 * - attachment_note (附件备注)
 */

export const name = '004_create_note_tables';

export function up(db) {
  // =====================================================
  // 1. po_note - 采购订单备注
  // =====================================================
  db.exec(`
    CREATE TABLE po_note (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      author TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (po_id) REFERENCES purchase_order(id) ON DELETE CASCADE
    );
  `);

  // =====================================================
  // 2. job_note - 作业备注
  // =====================================================
  db.exec(`
    CREATE TABLE job_note (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      author TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (job_id) REFERENCES job(id) ON DELETE CASCADE
    );
  `);

  // =====================================================
  // 3. order_item_note - 订单明细备注
  // =====================================================
  db.exec(`
    CREATE TABLE order_item_note (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_item_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      author TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (order_item_id) REFERENCES order_item(id) ON DELETE CASCADE
    );
  `);

  // =====================================================
  // 4. part_note - 零件备注
  // =====================================================
  db.exec(`
    CREATE TABLE part_note (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      part_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      author TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (part_id) REFERENCES part(id) ON DELETE CASCADE
    );
  `);

  // =====================================================
  // 5. shipment_note - 发货备注
  // =====================================================
  db.exec(`
    CREATE TABLE shipment_note (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shipment_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      author TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (shipment_id) REFERENCES shipment(id) ON DELETE CASCADE
    );
  `);

  // =====================================================
  // 6. attachment_note - 附件备注
  // =====================================================
  db.exec(`
    CREATE TABLE attachment_note (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attachment_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      author TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (attachment_id) REFERENCES part_attachment(id) ON DELETE CASCADE
    );
  `);
}

export function down(db) {
  db.exec('DROP TABLE IF EXISTS attachment_note;');
  db.exec('DROP TABLE IF EXISTS shipment_note;');
  db.exec('DROP TABLE IF EXISTS part_note;');
  db.exec('DROP TABLE IF EXISTS order_item_note;');
  db.exec('DROP TABLE IF EXISTS job_note;');
  db.exec('DROP TABLE IF EXISTS po_note;');
}
