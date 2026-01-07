/**
 * 迁移 003: 创建发货和工艺管理表
 * 
 * 创建以下表:
 * - shipment (发货单表)
 * - shipment_item (发货明细表)
 * - folder_mapping (客户文件夹映射表)
 * - process_template (工艺模板表)
 * - step_tracker (步骤跟踪表)
 */

export const name = '003_create_shipment_and_process_tables';

export function up(db) {
  // =====================================================
  // 1. shipment - 发货单表
  // =====================================================
  db.exec(`
    CREATE TABLE shipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      packing_slip_number TEXT UNIQUE NOT NULL,
      invoice_number TEXT UNIQUE,
      delivery_shipped_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // =====================================================
  // 2. shipment_item - 发货明细表
  // =====================================================
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
    );
  `);

  // =====================================================
  // 3. folder_mapping - 客户文件夹映射表
  // =====================================================
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
    );
  `);

  // =====================================================
  // 4. process_template - 工艺模板表
  // =====================================================
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
    );
  `);

  // =====================================================
  // 5. step_tracker - 步骤跟踪表
  // =====================================================
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
    );
  `);
}

export function down(db) {
  db.exec('DROP TABLE IF EXISTS step_tracker;');
  db.exec('DROP TABLE IF EXISTS process_template;');
  db.exec('DROP TABLE IF EXISTS folder_mapping;');
  db.exec('DROP TABLE IF EXISTS shipment_item;');
  db.exec('DROP TABLE IF EXISTS shipment;');
}
