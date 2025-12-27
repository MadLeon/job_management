/**
 * 迁移 014：创建 customers 表
 * 
 * 创建独立的客户表，支持使用统计与软删除。
 * 数据源：data/data.js 中的 customerList。
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const name = '014_create_customers_table';

export async function up(db) {
  // 创建 customers 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT UNIQUE NOT NULL,
      is_active INTEGER DEFAULT 1,
      usage_count INTEGER DEFAULT 0,
      last_used TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✓ Created customers table');

  // 从 data/data.js 导入 customerList
  const insertCustomer = db.prepare(`
    INSERT OR IGNORE INTO customers (customer_name, created_at, updated_at)
    VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  try {
    const dataPath = path.join(__dirname, '../../data/data.js');
    // 动态导入 customerList
    const dataModule = await import(`file://${dataPath}`);
    const customerList = dataModule.customerList || [];
    
    console.log(`  Found ${customerList.length} customers from data.js`);

    customerList.forEach(name => {
      insertCustomer.run(name);
    });
  } catch (err) {
    console.warn('  Warning: Could not import customerList from data.js:', err.message);
  }

  console.log('✓ Backfilled customers table');
}

export function down(db) {
  db.exec('DROP TABLE IF EXISTS customers;');
  console.log('✓ Dropped customers table');
}
