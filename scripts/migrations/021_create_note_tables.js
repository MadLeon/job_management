/**
 * 迁移 021: 创建备注表组 (6 个)
 * 
 * 目标:
 *   创建以下 6 个专用备注表，替代多态的单 note 表设计：
 *   - po_note (采购订单备注)
 *   - job_note (作业备注)
 *   - order_item_note (订单明细备注)
 *   - part_note (零件备注)
 *   - shipment_note (发货备注)
 *   - attachment_note (附件备注)
 * 
 * 优势:
 *   - 更清晰的业务语义
 *   - 更高效的查询性能
 *   - 更易于维护和扩展
 *   - 强制外键约束确保数据完整性
 */

export const name = '021_create_note_tables';

export function up(db) {
  // ============================================================================
  // 1. po_note - 采购订单备注
  // ============================================================================
  db.exec(`
    CREATE TABLE po_note (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      author TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (po_id) REFERENCES purchase_order(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ 创建表: po_note');

  // ============================================================================
  // 2. job_note - 作业备注
  // ============================================================================
  db.exec(`
    CREATE TABLE job_note (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      author TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (job_id) REFERENCES job(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ 创建表: job_note');

  // ============================================================================
  // 3. order_item_note - 订单明细备注
  // ============================================================================
  db.exec(`
    CREATE TABLE order_item_note (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_item_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      author TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (order_item_id) REFERENCES order_item(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ 创建表: order_item_note');

  // ============================================================================
  // 4. part_note - 零件备注
  // ============================================================================
  db.exec(`
    CREATE TABLE part_note (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      part_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      author TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (part_id) REFERENCES part(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ 创建表: part_note');

  // ============================================================================
  // 5. shipment_note - 发货备注
  // ============================================================================
  db.exec(`
    CREATE TABLE shipment_note (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shipment_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      author TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (shipment_id) REFERENCES shipment(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ 创建表: shipment_note');

  // ============================================================================
  // 6. attachment_note - 附件备注
  // ============================================================================
  db.exec(`
    CREATE TABLE attachment_note (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attachment_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      author TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (attachment_id) REFERENCES part_attachment(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ 创建表: attachment_note');

  console.log('\n✅ 迁移 021 完成：6 个专用备注表创建成功');
}

export function down(db) {
  // 反向删除表
  const tables = [
    'attachment_note',
    'shipment_note',
    'part_note',
    'order_item_note',
    'job_note',
    'po_note'
  ];

  for (const table of tables) {
    db.exec(`DROP TABLE IF EXISTS ${table}`);
    console.log(`✓ 删除表: ${table}`);
  }

  console.log('\n✅ 迁移 021 回滚完成');
}
