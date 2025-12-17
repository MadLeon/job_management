import getDB from '@/lib/db';

export default function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const {
        part_number,
        drawing_number,
        quantity,
        status,
        file_location,
        delivery_required_date,
      } = req.body;

      if (!part_number) {
        return res.status(400).json({ error: 'part_number is required' });
      }

      if (!drawing_number || !quantity || !status) {
        return res.status(400).json({ error: 'drawing_number, quantity, and status are required' });
      }

      const db = getDB();

      // 插入新的assembly_detail记录
      const stmt = db.prepare(`
        INSERT INTO assembly_detail (
          part_number,
          drawing_number,
          quantity,
          status,
          file_location,
          delivery_required_date,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now','localtime'), datetime('now','localtime'))
      `);

      const result = stmt.run(
        part_number,
        drawing_number,
        quantity,
        status,
        file_location || null,
        delivery_required_date || null
      );

      // 更新对应job的has_assembly_details字段为1
      const updateJobStmt = db.prepare(`
        UPDATE jobs
        SET has_assembly_details = 1
        WHERE part_number = ?
      `);

      updateJobStmt.run(part_number);

      res.status(201).json({
        message: 'Assembly detail created successfully',
        id: result.lastInsertRowid
      });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
