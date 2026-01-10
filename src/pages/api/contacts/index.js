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
    const { customer_id } = req.query;
    const db = getDB();

    let query = `
      SELECT 
        id as contact_id,
        customer_id,
        contact_name,
        contact_email,
        usage_count,
        last_used,
        created_at,
        updated_at
      FROM customer_contact
      WHERE 1=1
    `;

    const params = [];

    if (customer_id) {
      query += ` AND customer_id = ?`;
      params.push(customer_id);
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
