/**
 * 迁移 001: 创建核心业务表
 * 
 * 创建以下表:
 * - customer (客户主表)
 * - customer_contact (联系人表)
 * - purchase_order (采购订单表)
 * - job (作业表)
 * - order_item (订单明细表)
 */

export const name = '001_create_core_tables';

export function up(db) {
  // =====================================================
  // 1. customer - 客户主表
  // =====================================================
  db.exec(`
    CREATE TABLE customer (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL UNIQUE,
      usage_count INTEGER DEFAULT 0,
      last_used TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // =====================================================
  // 2. customer_contact - 联系人表
  // =====================================================
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
    );
  `);

  // =====================================================
  // 3. purchase_order - 采购订单表
  // =====================================================
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
    );
  `);

  // =====================================================
  // 4. job - 作业表
  // =====================================================
  db.exec(`
    CREATE TABLE job (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_number TEXT UNIQUE NOT NULL,
      po_id INTEGER NOT NULL,
      priority TEXT DEFAULT 'Normal',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (po_id) REFERENCES purchase_order(id) ON DELETE CASCADE
    );
  `);

  // =====================================================
  // 5. order_item - 订单明细表
  // =====================================================
  db.exec(`
    CREATE TABLE order_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      part_id INTEGER,
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
    );
  `);
}

export function down(db) {
  db.exec('DROP TABLE IF EXISTS order_item;');
  db.exec('DROP TABLE IF EXISTS job;');
  db.exec('DROP TABLE IF EXISTS purchase_order;');
  db.exec('DROP TABLE IF EXISTS customer_contact;');
  db.exec('DROP TABLE IF EXISTS customer;');
}
