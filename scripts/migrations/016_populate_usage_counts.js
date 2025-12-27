/**
 * 迁移 016：回填 customers 与 contacts 的使用计数与最后使用时间
 * 
 * 根据 jobs 与 job_history 中的记录，统计每个客户/联系人的使用次数，
 * 并设置 last_used 为最近涉及该实体的工作的创建时间。
 */

export const name = '016_populate_usage_counts';

export function up(db) {
  // 更新 customers 使用计数与 last_used
  console.log('Backfilling customers usage_count and last_used...');

  const customerUsage = db.prepare(`
    SELECT 
      c.customer_id,
      COUNT(DISTINCT j.job_id) as cnt,
      MAX(j.create_timestamp) as latest_date
    FROM customers c
    LEFT JOIN jobs j ON j.customer_name = c.customer_name
    WHERE c.is_active = 1
    GROUP BY c.customer_id
  `).all();

  const updateCustomer = db.prepare(`
    UPDATE customers 
    SET usage_count = ?, last_used = ?, updated_at = CURRENT_TIMESTAMP
    WHERE customer_id = ?
  `);

  customerUsage.forEach(row => {
    const count = row.cnt || 0;
    const lastUsed = row.latest_date || null;
    updateCustomer.run(count, lastUsed, row.customer_id);
  });

  console.log(`✓ Updated ${customerUsage.length} customers`);

  // 更新 contacts 使用计数与 last_used
  console.log('Backfilling contacts usage_count and last_used...');

  const contactUsage = db.prepare(`
    SELECT 
      c.contact_id,
      COUNT(DISTINCT j.job_id) as cnt,
      MAX(j.create_timestamp) as latest_date
    FROM contacts c
    LEFT JOIN jobs j ON j.customer_contact = c.contact_name 
      AND (j.customer_name = c.customer_name OR c.customer_name IS NULL)
    WHERE c.is_active = 1
    GROUP BY c.contact_id
  `).all();

  const updateContact = db.prepare(`
    UPDATE contacts 
    SET usage_count = ?, last_used = ?, updated_at = CURRENT_TIMESTAMP
    WHERE contact_id = ?
  `);

  contactUsage.forEach(row => {
    const count = row.cnt || 0;
    const lastUsed = row.latest_date || null;
    updateContact.run(count, lastUsed, row.contact_id);
  });

  console.log(`✓ Updated ${contactUsage.length} contacts`);
}

export function down(db) {
  // 回滚时将使用计数与 last_used 重置为默认值
  db.exec(`
    UPDATE customers SET usage_count = 0, last_used = NULL, updated_at = CURRENT_TIMESTAMP;
    UPDATE contacts SET usage_count = 0, last_used = NULL, updated_at = CURRENT_TIMESTAMP;
  `);
  console.log('✓ Reset usage_count and last_used for customers and contacts');
}
