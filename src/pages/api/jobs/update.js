import getDB from '@/lib/db';

export default function handler(req, res) {
  if (req.method === 'PUT') {
    try {
      const {
        job_id,
        po_number,
        oe_number,
        customer_name,
        customer_contact,
        line_number,
        part_number,
        part_description,
        revision,
        job_quantity,
        delivery_required_date,
        priority,
        file_location,
        drawing_release,
        unit_price,
      } = req.body;

      if (!job_id) {
        return res.status(400).json({ error: 'job_id is required' });
      }

      const db = getDB();

      // 更新jobs表
      const stmt = db.prepare(`
        UPDATE jobs
        SET 
          po_number = ?,
          oe_number = ?,
          customer_name = ?,
          customer_contact = ?,
          line_number = ?,
          part_number = ?,
          part_description = ?,
          revision = ?,
          job_quantity = ?,
          delivery_required_date = ?,
          priority = ?,
          file_location = ?,
          drawing_release = ?,
          unit_price = ?,
          last_modified = datetime('now','localtime')
        WHERE job_id = ?
      `);

      stmt.run(
        po_number || null,
        oe_number || null,
        customer_name || null,
        customer_contact || null,
        line_number || null,
        part_number || null,
        part_description || null,
        revision || null,
        job_quantity || null,
        delivery_required_date || null,
        priority || 'Normal',
        file_location || null,
        drawing_release || null,
        unit_price || null,
        job_id
      );

      res.status(200).json({
        message: 'Job updated successfully',
        job_id
      });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
