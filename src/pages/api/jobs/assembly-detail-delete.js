import getDB from '@/lib/db';

export default function handler(req, res) {
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'id query parameter is required' });
      }

      const db = getDB();

      // 获取要删除的assembly_detail记录，以便后续可能需要检查是否还有其他记录
      const recordToDelete = db.prepare(`
        SELECT part_number FROM assembly_detail WHERE id = ?
      `).get(id);

      if (!recordToDelete) {
        return res.status(404).json({ error: 'Assembly detail record not found' });
      }

      // 删除记录
      const deleteStmt = db.prepare(`
        DELETE FROM assembly_detail WHERE id = ?
      `);

      deleteStmt.run(id);

      // 检查该part_number是否还有其他assembly_detail记录
      const remainingCount = db.prepare(`
        SELECT COUNT(*) as count FROM assembly_detail WHERE part_number = ?
      `).get(recordToDelete.part_number);

      // 如果没有剩余记录，更新对应job的has_assembly_details为0
      if (remainingCount.count === 0) {
        const updateJobStmt = db.prepare(`
          UPDATE jobs SET has_assembly_details = 0 WHERE part_number = ?
        `);
        updateJobStmt.run(recordToDelete.part_number);
      }

      res.status(200).json({
        message: 'Assembly detail deleted successfully',
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
