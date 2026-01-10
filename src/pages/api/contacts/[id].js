/**
 * API: POST /api/contacts, PUT /api/contacts/:id
 * 
 * 创建或更新联系人信息（此阶段仅 API，UI 管理界面在后续提案中）。
 */

import getDB from '@/lib/db';

export default function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'POST') {
    // 创建新联系人
    try {
      const { contact_name, contact_email, customer_id } = req.body;

      if (!contact_name || typeof contact_name !== 'string') {
        return res.status(400).json({ error: 'contact_name is required' });
      }

      const db = getDB();
      const insert = db.prepare(`
        INSERT INTO customer_contact (customer_id, contact_name, contact_email, usage_count, last_used, created_at, updated_at)
        VALUES (?, ?, ?, 0, NULL, datetime('now', 'localtime'), datetime('now', 'localtime'))
      `);

      const result = insert.run(customer_id || null, contact_name, contact_email || null);

      res.status(201).json({
        contact_id: result.lastInsertRowid,
        customer_id: customer_id || null,
        contact_name,
        contact_email: contact_email || null,
        usage_count: 0,
        last_used: null
      });
    } catch (error) {
      console.error('API Error (POST /api/contacts):', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'PUT') {
    // 更新联系人信息
    try {
      const { contact_name, contact_email, customer_id } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'contact_id is required' });
      }

      const db = getDB();
      const update = db.prepare(`
        UPDATE customer_contact
        SET contact_name = COALESCE(?, contact_name),
            contact_email = COALESCE(?, contact_email),
            customer_id = COALESCE(?, customer_id),
            updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `);

      update.run(
        contact_name || null,
        contact_email !== undefined ? contact_email : null,
        customer_id !== undefined ? customer_id : null,
        id
      );

      const updated = db.prepare('SELECT id as contact_id, customer_id, contact_name, contact_email, usage_count, last_used, created_at, updated_at FROM customer_contact WHERE id = ?').get(id);
      res.status(200).json(updated);
    } catch (error) {
      console.error('API Error (PUT /api/contacts/:id):', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
