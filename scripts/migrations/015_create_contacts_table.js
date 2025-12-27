/**
 * 迁移 015：创建 contacts 表
 * 
 * 创建独立的联系人表，支持与客户关联、使用统计与软删除。
 * 数据源：从 jobs 与 job_history 中提取不重复的 customer_contact 值。
 */

export const name = '015_create_contacts_table';

export function up(db) {
  // 创建 contacts 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      contact_id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_name TEXT NOT NULL,
      customer_name TEXT,
      is_active INTEGER DEFAULT 1,
      usage_count INTEGER DEFAULT 0,
      last_used TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✓ Created contacts table');

  // 从 jobs 与 job_history 中提取不重复的联系人
  const contacts = new Set();

  const jobContacts = db.prepare(`
    SELECT DISTINCT customer_contact, customer_name 
    FROM jobs 
    WHERE customer_contact IS NOT NULL AND customer_contact != ''
  `).all();

  const historyContacts = db.prepare(`
    SELECT DISTINCT customer_contact, customer_name 
    FROM job_history 
    WHERE customer_contact IS NOT NULL AND customer_contact != ''
  `).all();

  console.log(`  Found ${jobContacts.length} unique contacts from jobs`);
  console.log(`  Found ${historyContacts.length} unique contacts from job_history`);

  // 合并并去重
  const contactMap = new Map();
  [...jobContacts, ...historyContacts].forEach(row => {
    const key = `${row.customer_contact}|${row.customer_name || ''}`;
    if (!contactMap.has(key)) {
      contactMap.set(key, row);
    }
  });

  // 插入联系人
  const insertContact = db.prepare(`
    INSERT OR IGNORE INTO contacts (contact_name, customer_name, created_at, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  contactMap.forEach(row => {
    insertContact.run(
      row.customer_contact,
      row.customer_name || null
    );
  });

  console.log(`✓ Backfilled contacts table with ${contactMap.size} unique contacts`);
}

export function down(db) {
  db.exec('DROP TABLE IF EXISTS contacts;');
  console.log('✓ Dropped contacts table');
}
