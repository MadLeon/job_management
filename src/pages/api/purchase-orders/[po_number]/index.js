/**
 * API: GET /api/purchase-orders/[po_number]
 * 
 * 根据采购订单号获取单个采购订单的详细信息，包括关联的客户、联系人和所有订单项目。
 */

import getDB from '@/lib/db';

export default function handler(req, res) {
  const { po_number } = req.query;

  if (req.method === 'GET') {
    try {
      const db = getDB();
      
      // 获取采购订单的基本信息
      const purchaseOrder = db.prepare(`
        SELECT 
          po.id as po_id,
          po.po_number,
          po.oe_number,
          po.contact_id,
          po.is_active,
          po.created_at,
          po.updated_at,
          cc.contact_name,
          cc.contact_email,
          c.id as customer_id,
          c.customer_name
        FROM purchase_order po
        LEFT JOIN customer_contact cc ON po.contact_id = cc.id
        LEFT JOIN customer c ON cc.customer_id = c.id
        WHERE po.po_number = ?
      `).get(po_number);

      if (!purchaseOrder) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }

      // 获取关联的所有工作订单项目
      const jobs = db.prepare(`
        SELECT 
          j.id as job_id,
          j.job_number,
          j.priority,
          j.created_at,
          j.updated_at,
          oi.id as order_item_id,
          oi.line_number,
          oi.quantity,
          oi.status,
          oi.delivery_required_date,
          oi.drawing_release_date,
          p.id as part_id,
          p.drawing_number,
          p.revision,
          p.description
        FROM job j
        LEFT JOIN order_item oi ON j.id = oi.job_id
        LEFT JOIN part p ON oi.part_id = p.id
        WHERE j.po_id = (SELECT id FROM purchase_order WHERE po_number = ?)
        ORDER BY j.created_at DESC, oi.line_number ASC
      `).all(po_number);

      res.status(200).json({
        ...purchaseOrder,
        jobs
      });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
