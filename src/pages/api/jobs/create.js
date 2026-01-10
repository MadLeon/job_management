/**
 * API: POST /api/jobs/create
 * 
 * 创建新的作业，流程：customer → purchase_order → job → order_item → part
 * 并更新关联客户与联系人的使用计数。
 */

import getDB from '@/lib/db';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      job_number,
      po_number,
      oe_number,
      customer_id,
      contact_id,
      line_number,
      drawing_number,
      description,
      revision = '-',
      quantity = 0,
      delivery_required_date,
      drawing_release_date,
      unit_price = 0,
      priority = 'Normal',
    } = req.body;

    // 验证必填字段
    if (!job_number || !line_number || !customer_id) {
      return res.status(400).json({ 
        error: 'job_number, line_number, and customer_id are required' 
      });
    }

    const db = getDB();
    const now = new Date().toISOString();

    try {
      // 步骤1：获取或创建 customer
      // customer_id已直接提供，只需验证存在
      const customer = db.prepare('SELECT id FROM customer WHERE id = ?').get(customer_id);
      if (!customer) {
        return res.status(400).json({ error: 'Customer not found' });
      }

      // 步骤2：获取或创建 purchase_order
      let po;
      if (po_number) {
        po = db.prepare('SELECT id FROM purchase_order WHERE po_number = ?').get(po_number);
        if (!po) {
          // 创建新的PO
          const insertPO = db.prepare(`
            INSERT INTO purchase_order (po_number, oe_number, contact_id, is_active, created_at, updated_at)
            VALUES (?, ?, ?, 1, datetime('now', 'localtime'), datetime('now', 'localtime'))
          `);
          const poResult = insertPO.run(po_number, oe_number || null, contact_id || null);
          po = { id: poResult.lastInsertRowid };
        }
      } else {
        return res.status(400).json({ error: 'po_number is required' });
      }

      // 步骤3：创建 job
      const insertJob = db.prepare(`
        INSERT INTO job (job_number, po_id, priority, created_at, updated_at)
        VALUES (?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
      `);
      const jobResult = insertJob.run(job_number, po.id, priority);
      const jobId = jobResult.lastInsertRowid;

      // 步骤4：获取或创建 part
      let part;
      if (drawing_number) {
        part = db.prepare(
          'SELECT id FROM part WHERE drawing_number = ? AND revision = ? LIMIT 1'
        ).get(drawing_number, revision);
        
        if (!part) {
          // 创建新零件
          const insertPart = db.prepare(`
            INSERT INTO part (drawing_number, revision, description, is_assembly, production_count, created_at, updated_at)
            VALUES (?, ?, ?, 0, 0, datetime('now', 'localtime'), datetime('now', 'localtime'))
          `);
          const partResult = insertPart.run(drawing_number, revision, description || null);
          part = { id: partResult.lastInsertRowid };
        }
      }

      // 步骤5：创建 order_item
      const insertOrderItem = db.prepare(`
        INSERT INTO order_item (
          job_id, part_id, line_number, quantity, status,
          delivery_required_date, drawing_release_date, actual_price,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
      `);
      const orderItemResult = insertOrderItem.run(
        jobId,
        part ? part.id : null,
        line_number,
        quantity,
        delivery_required_date || null,
        drawing_release_date || null,
        unit_price
      );

      // 步骤6：更新客户使用计数
      db.prepare(`
        UPDATE customer
        SET usage_count = usage_count + 1, last_used = ?, updated_at = ?
        WHERE id = ?
      `).run(now, now, customer_id);

      // 步骤7：更新联系人使用计数（如果提供）
      if (contact_id) {
        db.prepare(`
          UPDATE customer_contact
          SET usage_count = usage_count + 1, last_used = ?, updated_at = ?
          WHERE id = ?
        `).run(now, now, contact_id);
      }

      // 返回新创建的作业
      const newJob = db.prepare(`
        SELECT 
          j.id as job_id,
          j.job_number,
          j.po_id,
          j.priority,
          j.created_at,
          oi.id as order_item_id,
          oi.line_number,
          oi.quantity,
          oi.status,
          p.id as part_id,
          p.drawing_number,
          p.revision
        FROM job j
        LEFT JOIN order_item oi ON j.id = oi.job_id
        LEFT JOIN part p ON oi.part_id = p.id
        WHERE j.id = ?
      `).all(jobId);

      res.status(201).json({
        message: 'Job created successfully',
        job: newJob[0] || { job_id: jobId }
      });
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  } catch (error) {
    console.error('API Error (POST /api/jobs/create):', error);
    res.status(500).json({ error: error.message });
  }
}
