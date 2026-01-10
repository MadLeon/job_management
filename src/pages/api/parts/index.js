/**
 * API: GET /api/parts
 * 
 * 获取所有Assembly类型的零件列表（is_assembly=1）。
 */

import getDB from '@/lib/db';

export default function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { limit = 100 } = req.query;
      const limitNum = parseInt(limit);

      const db = getDB();

      // 查询所有is_assembly=1的零件
      const parts = db.prepare(`
        SELECT 
          id,
          previous_id,
          next_id,
          drawing_number,
          revision,
          description,
          is_assembly,
          production_count,
          total_production_hour,
          total_administrative_hour,
          unit_price,
          created_at,
          updated_at
        FROM part
        WHERE is_assembly = 1
        ORDER BY created_at DESC
        LIMIT ?
      `).all(limitNum);

      res.status(200).json({
        parts,
        total: parts.length
      });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
