/**
 * API: GET /api/contacts
 * 
 * 获取活跃联系人列表，按 usage_count 降序、contact_name 升序（不区分大小写）排序。
 * 支持按 customer_name 过滤。
 */

import getDB from '@/lib/db';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { customer_name } = req.query;
    const db = getDB();

    let query = `
      SELECT 
        contact_id,
        contact_name,
        customer_name,
        is_active,
        usage_count,
        last_used,
        created_at,
        updated_at
      FROM contacts
      WHERE is_active = 1
    `;

    const params = [];

    if (customer_name) {
      query += ` AND customer_name = ?`;
      params.push(customer_name);
    }

    query += ` ORDER BY usage_count DESC, LOWER(contact_name) ASC`;

    const contacts = db.prepare(query).all(...params);

    res.status(200).json({
      contacts,
      total: contacts.length
    });
  } catch (error) {
    console.error('API Error (GET /api/contacts):', error);
    res.status(500).json({ error: error.message });
  }
}
