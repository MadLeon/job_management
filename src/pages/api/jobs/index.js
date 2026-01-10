/**
 * API: GET /api/jobs
 * 
 * 获取所有作业列表，包含关联的客户、采购订单、订单项、零件信息。
 */

import getDB from '@/lib/db';

export default function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const db = getDB();
      
      // 联查：job + order_item + part + purchase_order + customer_contact + customer
      const jobs = db.prepare(`
        SELECT 
          j.id as job_id,
          j.job_number,
          j.po_id,
          j.priority,
          j.created_at,
          j.updated_at,
          oi.id as order_item_id,
          oi.line_number,
          oi.quantity as job_quantity,
          oi.status,
          oi.delivery_required_date,
          oi.drawing_release_date,
          p.id as part_id,
          p.drawing_number as part_number,
          p.revision,
          p.description,
          p.is_assembly,
          po.po_number,
          po.oe_number,
          c.id as customer_id,
          c.customer_name
        FROM job j
        LEFT JOIN order_item oi ON j.id = oi.job_id
        LEFT JOIN part p ON oi.part_id = p.id
        LEFT JOIN purchase_order po ON j.po_id = po.id
        LEFT JOIN customer_contact cc ON po.contact_id = cc.id
        LEFT JOIN customer c ON cc.customer_id = c.id
        ORDER BY j.created_at DESC
      `).all();
      
      res.status(200).json(jobs);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}