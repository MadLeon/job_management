/**
 * API: POST /api/jobs
 * 
 * 创建新的作业，并更新关联客户与联系人的使用计数。
 */

import getDB from '@/lib/db';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      job_number,
      oe_number,
      customer_name,
      customer_contact,
      line_number,
      part_number,
      part_description,
      revision,
      job_quantity,
      delivery_required_date,
      priority = 'Normal',
      file_location,
      drawing_release,
      unit_price,
      po_number,
      packing_slip,
      packing_quantity,
      invoice_number,
      delivery_shipped_date,
    } = req.body;

    // 验证必填字段
    if (!job_number || !line_number) {
      return res.status(400).json({ error: 'job_number and line_number are required' });
    }

    const db = getDB();
    const now = new Date().toISOString();
    const unique_key = `${job_number}|${line_number}`;

    // 创建新作业
    const insertJob = db.prepare(`
      INSERT INTO jobs (
        job_number, oe_number, customer_name, customer_contact,
        line_number, part_number, part_description, revision,
        job_quantity, delivery_required_date, priority, file_location,
        drawing_release, unit_price, po_number, packing_slip,
        packing_quantity, invoice_number, delivery_shipped_date,
        unique_key, create_timestamp, last_modified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertJob.run(
      job_number, oe_number, customer_name, customer_contact,
      line_number, part_number, part_description, revision,
      job_quantity, delivery_required_date, priority, file_location,
      drawing_release, unit_price, po_number, packing_slip,
      packing_quantity, invoice_number, delivery_shipped_date,
      unique_key, now, now
    );

    const jobId = result.lastInsertRowid;

    // 更新客户使用计数
    if (customer_name) {
      const customer = db.prepare('SELECT customer_id FROM customers WHERE customer_name = ?').get(customer_name);
      if (customer) {
        db.prepare(`
          UPDATE customers
          SET usage_count = usage_count + 1, last_used = ?, updated_at = ?
          WHERE customer_id = ?
        `).run(now, now, customer.customer_id);
      }
    }

    // 更新联系人使用计数
    if (customer_contact) {
      const contact = db.prepare(`
        SELECT contact_id FROM contacts 
        WHERE contact_name = ? AND (customer_name = ? OR customer_name IS NULL)
      `).get(customer_contact, customer_name || null);
      
      if (contact) {
        db.prepare(`
          UPDATE contacts
          SET usage_count = usage_count + 1, last_used = ?, updated_at = ?
          WHERE contact_id = ?
        `).run(now, now, contact.contact_id);
      }
    }

    // 返回新创建的作业
    const newJob = db.prepare('SELECT * FROM jobs WHERE job_id = ?').get(jobId);

    res.status(201).json({
      message: 'Job created successfully',
      job: newJob
    });
  } catch (error) {
    console.error('API Error (POST /api/jobs):', error);
    res.status(500).json({ error: error.message });
  }
}
