/**
 * API: POST /api/customers, PUT /api/customers/:id
 * 
 * 创建或更新客户信息（此阶段仅 API，UI 管理界面在后续提案中）。
 */

import getDB from '@/lib/db';

export default function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'POST') {
    // 创建新客户
    try {
      const { customer_name } = req.body;

      if (!customer_name || typeof customer_name !== 'string') {
        return res.status(400).json({ error: 'customer_name is required' });
      }

      const db = getDB();
      const insert = db.prepare(`
        INSERT INTO customers (customer_name, is_active, usage_count, created_at, updated_at)
        VALUES (?, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      const result = insert.run(customer_name);

      res.status(201).json({
        customer_id: result.lastInsertRowid,
        customer_name,
        is_active: 1,
        usage_count: 0,
        last_used: null
      });
    } catch (error) {
      console.error('API Error (POST /api/customers):', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'PUT') {
    // 更新客户信息
    try {
      const { customer_name, is_active } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'customer_id is required' });
      }

      const db = getDB();
      const update = db.prepare(`
        UPDATE customers
        SET customer_name = COALESCE(?, customer_name),
            is_active = COALESCE(?, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE customer_id = ?
      `);

      update.run(
        customer_name || null,
        is_active !== undefined ? is_active : null,
        id
      );

      const updated = db.prepare('SELECT * FROM customers WHERE customer_id = ?').get(id);
      res.status(200).json(updated);
    } catch (error) {
      console.error('API Error (PUT /api/customers/:id):', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
