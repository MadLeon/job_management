/**
 * API: GET /api/purchase-orders
 * 
 * 获取所有采购订单列表，包含关联的客户、联系人和订单项信息。
 */

import getDB from '@/lib/db';

export default function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const db = getDB();
      
      // 联查：purchase_order + customer_contact + customer + job
      const purchaseOrders = db.prepare(`
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
          c.customer_name,
          COUNT(DISTINCT j.id) as job_count
        FROM purchase_order po
        LEFT JOIN customer_contact cc ON po.contact_id = cc.id
        LEFT JOIN customer c ON cc.customer_id = c.id
        LEFT JOIN job j ON po.id = j.po_id
        GROUP BY po.id
        ORDER BY po.created_at DESC
      `).all();
      
      res.status(200).json(purchaseOrders);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
