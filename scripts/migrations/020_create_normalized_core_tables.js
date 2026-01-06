/**
 * 迁移 020: 创建新规范化的核心业务表
 * 
 * 目标:
 *   1. 创建以下 14 个核心业务表：
 *      - customer (客户表)
 *      - customer_contact (联系人表)
 *      - purchase_order (采购订单表)
 *      - job (作业表)
 *      - order_item (订单明细表)
 *      - part (零件主表)
 *      - part_tree (BOM 表)
 *      - shipment (发货单表)
 *      - shipment_item (发货明细表)
 *      - part_attachment (零件附件表)
 *      - drawing_file (图纸文件表)
 *      - folder_mapping (客户文件夹映射表)
 *      - process_template (工艺模板表)
 *      - step_tracker (步骤追踪表)
 * 
 *   2. 设置所有外键约束和唯一约束
 *   3. 启用 FOREIGN_KEYS 支持
 * 
 * 注意: 这个迁移脚本只创建表结构，数据迁移在后续脚本中进行
 */

export const name = '020_create_normalized_core_tables';

export function up(db) {
  // 启用外键支持
  db.pragma('foreign_keys = ON');

  // ============================================================================
  // 1. customer - 客户主表
  // ============================================================================
  db.exec(`
    CREATE TABLE customer (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL UNIQUE,
      usage_count INTEGER DEFAULT 0,
      last_used TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `);
  console.log('✓ 创建表: customer');

  // ============================================================================
  // 2. customer_contact - 联系人表
  // ============================================================================
  db.exec(`
    CREATE TABLE customer_contact (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      contact_name TEXT NOT NULL,
      contact_email TEXT,
      usage_count INTEGER DEFAULT 0,
      last_used TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ 创建表: customer_contact');

  // ============================================================================
  // 3. purchase_order - 采购订单表
  // ============================================================================
  db.exec(`
    CREATE TABLE purchase_order (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_number TEXT NOT NULL UNIQUE,
      oe_number TEXT,
      contact_id INTEGER,
      is_active INTEGER DEFAULT 1,
      closed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (contact_id) REFERENCES customer_contact(id) ON DELETE SET NULL
    )
  `);
  console.log('✓ 创建表: purchase_order');

  // ============================================================================
  // 4. job - 作业表
  // ============================================================================
  db.exec(`
    CREATE TABLE job (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_number TEXT UNIQUE NOT NULL,
      po_id INTEGER NOT NULL,
      priority TEXT DEFAULT 'Normal',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (po_id) REFERENCES purchase_order(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ 创建表: job');

  // ============================================================================
  // 5. part - 零件主表 (支持版本链)
  // ============================================================================
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
    )
  `);
  console.log('✓ 创建表: part');

  // ============================================================================
  // 6. order_item - 订单明细表
  // ============================================================================
  db.exec(`
    CREATE TABLE order_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      part_id INTEGER NOT NULL,
      line_number INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      actual_price REAL,
      production_hour REAL DEFAULT 0,
      administrative_hour REAL DEFAULT 0,
      status TEXT DEFAULT 'PENDING',
      drawing_release_date TEXT,
      delivery_required_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (job_id) REFERENCES job(id) ON DELETE CASCADE,
      FOREIGN KEY (part_id) REFERENCES part(id),
      UNIQUE(job_id, line_number)
    )
  `);
  console.log('✓ 创建表: order_item');

  // ============================================================================
  // 7. part_tree - BOM 表 (自引用)
  // ============================================================================
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
    )
  `);
  console.log('✓ 创建表: part_tree');

  // ============================================================================
  // 8. shipment - 发货单表
  // ============================================================================
  db.exec(`
    CREATE TABLE shipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      packing_slip_number TEXT UNIQUE NOT NULL,
      invoice_number TEXT UNIQUE,
      delivery_shipped_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `);
  console.log('✓ 创建表: shipment');

  // ============================================================================
  // 9. shipment_item - 发货明细表
  // ============================================================================
  db.exec(`
    CREATE TABLE shipment_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_item_id INTEGER NOT NULL,
      shipment_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (order_item_id) REFERENCES order_item(id),
      FOREIGN KEY (shipment_id) REFERENCES shipment(id) ON DELETE CASCADE,
      UNIQUE(order_item_id, shipment_id)
    )
  `);
  console.log('✓ 创建表: shipment_item');

  // ============================================================================
  // 10. part_attachment - 零件附件表 (可关联 part 或 order_item)
  // ============================================================================
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
    )
  `);
  console.log('✓ 创建表: part_attachment');

  // ============================================================================
  // 11. drawing_file - 图纸文件表
  // ============================================================================
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
    )
  `);
  console.log('✓ 创建表: drawing_file');

  // ============================================================================
  // 12. folder_mapping - 客户文件夹映射表
  // ============================================================================
  db.exec(`
    CREATE TABLE folder_mapping (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      folder_name TEXT NOT NULL,
      is_verified INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE,
      UNIQUE(customer_id, folder_name)
    )
  `);
  console.log('✓ 创建表: folder_mapping');

  // ============================================================================
  // 13. process_template - 工艺模板表
  // ============================================================================
  db.exec(`
    CREATE TABLE process_template (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      part_id INTEGER NOT NULL,
      row_number INTEGER NOT NULL,
      shop_code TEXT NOT NULL,
      description TEXT,
      remark TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (part_id) REFERENCES part(id) ON DELETE CASCADE,
      UNIQUE(part_id, row_number)
    )
  `);
  console.log('✓ 创建表: process_template');

  // ============================================================================
  // 14. step_tracker - 步骤追踪表
  // ============================================================================
  db.exec(`
    CREATE TABLE step_tracker (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_item_id INTEGER NOT NULL,
      process_template_id INTEGER NOT NULL,
      operator_id TEXT,
      machine_id TEXT,
      status TEXT DEFAULT 'PENDING',
      start_time TEXT,
      end_time TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (order_item_id) REFERENCES order_item(id) ON DELETE CASCADE,
      FOREIGN KEY (process_template_id) REFERENCES process_template(id)
    )
  `);
  console.log('✓ 创建表: step_tracker');

  console.log('\n✅ 迁移 020 完成：14 个核心业务表创建成功');
}

export function down(db) {
  // 反向删除表（按创建顺序反向）
  const tables = [
    'step_tracker',
    'process_template',
    'folder_mapping',
    'drawing_file',
    'part_attachment',
    'shipment_item',
    'shipment',
    'part_tree',
    'order_item',
    'part',
    'job',
    'purchase_order',
    'customer_contact',
    'customer'
  ];

  for (const table of tables) {
    db.exec(`DROP TABLE IF EXISTS ${table}`);
    console.log(`✓ 删除表: ${table}`);
  }

  console.log('\n✅ 迁移 020 回滚完成');
}
