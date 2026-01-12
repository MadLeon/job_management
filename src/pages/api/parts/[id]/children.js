/**
 * API: GET /api/parts/[id]/children
 * 
 * 获取指定 part_id 的所有子组件（assembly details）
 * 基于 part_tree 表的 parent_id 关系
 * 
 * @query {number} id - part_id（必需）
 * @query {number} orderItemId - order_item_id（可选，用于获取 delivery_required_date 和 status）
 */

import getDB from '@/lib/db';

export default function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { id, orderItemId } = req.query;
      const partId = parseInt(id);
      const parentOrderItemId = orderItemId ? parseInt(orderItemId) : null;

      if (!partId || isNaN(partId)) {
        return res.status(400).json({ error: 'Invalid part id' });
      }

      const db = getDB();

      // 首先获取父 order_item 的信息（用于获取 delivery_required_date 和 status）
      let parentOrderItemInfo = null;
      if (parentOrderItemId) {
        parentOrderItemInfo = db.prepare(`
          SELECT 
            delivery_required_date,
            status
          FROM order_item
          WHERE id = ?
        `).get(parentOrderItemId);
      }

      // 查询所有子组件：根据 part_tree 表获取 parent_id = partId 的所有记录
      const children = db.prepare(`
        SELECT 
          p.id,
          p.drawing_number,
          p.revision,
          p.description,
          p.is_assembly,
          pt.quantity,
          pt.parent_id,
          pt.child_id
        FROM part_tree pt
        LEFT JOIN part p ON pt.child_id = p.id
        WHERE pt.parent_id = ?
        ORDER BY pt.id ASC
      `).all(partId);

      // 为每个子组件添加 delivery_required_date 和 status
      const enrichedChildren = children.map(child => ({
        ...child,
        delivery_required_date: parentOrderItemInfo?.delivery_required_date || null,
        status: parentOrderItemInfo?.status || null
      }));

      res.status(200).json(enrichedChildren);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

