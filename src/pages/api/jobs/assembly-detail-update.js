import getDB from '@/lib/db';

export default function handler(req, res) {
  if (req.method === 'PUT') {
    try {

      const {
        id,
        drawing_number,
        quantity,
        status,
        file_location,
        revision,
        unique_key
      } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'assembly_detail id is required' });
      }

      if (!drawing_number || !quantity || !status) {
        return res.status(400).json({ error: 'drawing_number, quantity, and status are required' });
      }

      const db = getDB();

      // 使用SQLite的日期时间函数更新assembly_detail

      // 支持 unique_key 字段的更新（如有传递）
      let sql = `UPDATE assembly_detail SET drawing_number = ?, quantity = ?, status = ?, file_location = ?, updated_at = datetime('now','localtime')`;
      const params = [drawing_number, quantity, status, file_location || null];
      if (unique_key !== undefined) {
        sql += ', unique_key = ?';
        params.push(unique_key);
      }
      sql += ' WHERE id = ?';
      params.push(id);
      const stmt = db.prepare(sql);
      stmt.run(...params);

      // 如果提供了revision，也更新对应的detail_drawing记录
      if (revision !== undefined && revision !== null) {
        const detailDrawingStmt = db.prepare(`
          UPDATE detail_drawing
          SET 
            revision = ?,
            updated_at = datetime('now','localtime')
          WHERE drawing_number = ?
        `);
        detailDrawingStmt.run(revision, drawing_number);
      }

      res.status(200).json({
        message: 'Assembly detail updated successfully',
        id
      });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
