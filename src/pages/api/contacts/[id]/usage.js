/**
 * API: PUT /api/contacts/:id/usage
 * 
 * 更新联系人的使用计数与最后使用时间。
 * 仅在新建 job 时调用，last_used 设为传入的 job 创建时间。
 */

import getDB from '@/lib/db';

export default function handler(req, res) {
  const { id } = req.query;

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!id) {
      return res.status(400).json({ error: 'contact_id is required' });
    }

    const { jobCreatedAt } = req.body;

    const db = getDB();

    // 递增 usage_count 并更新 last_used
    const update = db.prepare(`
      UPDATE customer_contact
      SET usage_count = usage_count + 1,
          last_used = ?,
          updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `);

    update.run(jobCreatedAt || new Date().toISOString(), id);

    const updated = db.prepare('SELECT id as contact_id, customer_id, contact_name, contact_email, usage_count, last_used, created_at, updated_at FROM customer_contact WHERE id = ?').get(id);
    res.status(200).json(updated);
  } catch (error) {
    console.error('API Error (PUT /api/contacts/:id/usage):', error);
    res.status(500).json({ error: error.message });
  }
}
