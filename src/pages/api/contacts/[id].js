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
      const { contact_name, customer_name } = req.body;

      if (!contact_name || typeof contact_name !== 'string') {
        return res.status(400).json({ error: 'contact_name is required' });
      }

      const db = getDB();
      const insert = db.prepare(`
        INSERT INTO contacts (contact_name, customer_name, is_active, usage_count, last_used, created_at, updated_at)
        VALUES (?, ?, 1, 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      const result = insert.run(contact_name, customer_name || null);

      res.status(201).json({
        contact_id: result.lastInsertRowid,
        contact_name,
        customer_name: customer_name || null,
        is_active: 1,
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
      const { contact_name, customer_name, is_active } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'contact_id is required' });
      }

      const db = getDB();
      const update = db.prepare(`
        UPDATE contacts
        SET contact_name = COALESCE(?, contact_name),
            customer_name = COALESCE(?, customer_name),
            is_active = COALESCE(?, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE contact_id = ?
      `);

      update.run(
        contact_name || null,
        customer_name !== undefined ? customer_name : null,
        is_active !== undefined ? is_active : null,
        id
      );

      const updated = db.prepare('SELECT * FROM contacts WHERE contact_id = ?').get(id);
      res.status(200).json(updated);
    } catch (error) {
      console.error('API Error (PUT /api/contacts/:id):', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
