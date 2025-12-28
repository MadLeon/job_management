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

      // 查找 jobs 表中对应 part_number 的 unique_key
      const job = db.prepare('SELECT unique_key FROM jobs WHERE part_number = ? LIMIT 1').get(part_number);
      const unique_key = job && job.unique_key ? job.unique_key : null;

      // 插入新的 assembly_detail 记录，补全 unique_key 字段
      const stmt = db.prepare(`
        INSERT INTO assembly_detail (
          part_number,
          drawing_number,
          quantity,
          status,
          file_location,
          delivery_required_date,
          unique_key,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'), datetime('now','localtime'))
      `);

      const result = stmt.run(
        part_number,
        drawing_number,
        quantity,
        status,
        file_location || null,
        delivery_required_date || null,
        unique_key
      );

      // 更新对应 job 的 has_assembly_details 字段为 1
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
