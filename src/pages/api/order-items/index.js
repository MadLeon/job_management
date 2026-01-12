/**
 * API: GET /api/order-items
 * 
 * 获取所有订单项列表，包含关联的客户、采购订单、零件信息。
 * 同时判断每个订单项是否有组件详情可展开（has_assembly_details）
 */

import getDB from '@/lib/db';

export default function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const db = getDB();

      // 联查：job + order_item + part + purchase_order + customer + customer_contact
      // 同时检查 part_tree 以判断是否有子组件
      // 注意：某些 PO 的 contact_id 可能为 null，此时 customer 信息为 null
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
          p.description as part_description,
          p.is_assembly,
          po.po_number,
          po.oe_number,
          cc.contact_name as customer_contact,
          c.id as customer_id,
          c.customer_name,
          CASE WHEN pt.parent_id IS NOT NULL THEN 1 ELSE 0 END as has_assembly_details
        FROM job j
        LEFT JOIN order_item oi ON j.id = oi.job_id
        LEFT JOIN part p ON oi.part_id = p.id
        LEFT JOIN part_tree pt ON p.id = pt.parent_id
        LEFT JOIN purchase_order po ON j.po_id = po.id
        LEFT JOIN customer_contact cc ON po.contact_id = cc.id
        LEFT JOIN customer c ON cc.customer_id = c.id
        ORDER BY j.created_at DESC
      `).all();

      // 去重：因为 part_tree 可能有多条记录，需要对结果进行去重处理
      const uniqueJobs = [];
      const seen = new Set();

      for (const job of jobs) {
        const key = `${job.job_id}-${job.order_item_id}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueJobs.push(job);
        }
      }

      res.status(200).json(uniqueJobs);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
