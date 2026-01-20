/**
 * API: GET /api/order-items/[id]
 * 
 * 根据订单项 ID 获取该订单项的详细信息，包括关联的工作、零件、采购订单等信息
 */

import getDB from '@/lib/db';

export default function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const db = getDB();

      // 获取订单项详情
      const orderItem = db.prepare(`
        SELECT 
          oi.id as order_item_id,
          oi.job_id,
          oi.part_id,
          oi.line_number,
          oi.quantity,
          oi.status,
          oi.delivery_required_date,
          oi.drawing_release_date,
          oi.created_at,
          oi.updated_at,
          j.id as job_id,
          j.job_number,
          j.po_id,
          j.priority,
          j.created_at as job_created_at,
          j.updated_at as job_updated_at,
          p.id as part_id,
          p.drawing_number,
          p.revision,
          p.description as part_description,
          p.is_assembly,
          po.po_number,
          po.oe_number,
          cc.contact_name as customer_contact,
          c.id as customer_id,
          c.customer_name
        FROM order_item oi
        LEFT JOIN job j ON oi.job_id = j.id
        LEFT JOIN part p ON oi.part_id = p.id
        LEFT JOIN purchase_order po ON j.po_id = po.id
        LEFT JOIN customer_contact cc ON po.contact_id = cc.id
        LEFT JOIN customer c ON cc.customer_id = c.id
        WHERE oi.id = ?
      `).get(id);

      if (!orderItem) {
        return res.status(404).json({ error: 'Order item not found' });
      }

      res.status(200).json(orderItem);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
