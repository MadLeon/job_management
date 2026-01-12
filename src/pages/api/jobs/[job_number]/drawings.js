/**
 * API: GET /api/jobs/[job_number]/drawings
 * 
 * 获取指定工作的所有图纸和组件信息
 * 包括该工作下所有订单项的零件及其子组件
 */

import getDB from '@/lib/db';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { job_number } = req.query;

    if (!job_number) {
      return res.status(400).json({ error: 'job_number is required' });
    }

    const db = getDB();

    /**
     * 查询逻辑：
     * 1. 通过 job_number 找到 job
     * 2. 通过 job.id 找到所有 order_items
     * 3. 对于每个 order_item 的 part，获取：
     *    - 该 part 本身的信息
     *    - 该 part 的所有子组件（如果是装配体）
     */
    const drawings = db.prepare(`
      SELECT
        p.id as part_id,
        p.drawing_number,
        p.revision,
        p.description,
        p.is_assembly,
        oi.id as order_item_id,
        oi.line_number,
        oi.quantity as job_quantity,
        oi.status,
        oi.delivery_required_date,
        oi.drawing_release_date,
        NULL as parent_part_id,
        0 as is_child
      FROM job j
      LEFT JOIN order_item oi ON j.id = oi.job_id
      LEFT JOIN part p ON oi.part_id = p.id
      WHERE j.job_number = ?
      
      UNION ALL
      
      SELECT
        cp.id as part_id,
        cp.drawing_number,
        cp.revision,
        cp.description,
        cp.is_assembly,
        oi.id as order_item_id,
        oi.line_number,
        oi.quantity as job_quantity,
        oi.status,
        oi.delivery_required_date,
        oi.drawing_release_date,
        p.id as parent_part_id,
        1 as is_child
      FROM job j
      LEFT JOIN order_item oi ON j.id = oi.job_id
      LEFT JOIN part p ON oi.part_id = p.id
      LEFT JOIN part_tree pt ON p.id = pt.parent_id
      LEFT JOIN part cp ON pt.child_id = cp.id
      WHERE j.job_number = ? AND pt.child_id IS NOT NULL
      
      ORDER BY oi.line_number ASC, is_child ASC, part_id ASC
    `).all(job_number, job_number);

    res.status(200).json(drawings);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
}
