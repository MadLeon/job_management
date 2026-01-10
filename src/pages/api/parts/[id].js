/**
 * API: PUT /api/parts/[id]
 * 
 * 更新零件信息。
 */

import getDB from '@/lib/db';

export default function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const {
        drawing_number,
        revision,
        description,
        is_assembly,
        production_count,
        total_production_hour,
        total_administrative_hour,
        unit_price
      } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'part id is required' });
      }

      const db = getDB();

      // 更新零件信息
      const update = db.prepare(`
        UPDATE part
        SET 
          drawing_number = COALESCE(?, drawing_number),
          revision = COALESCE(?, revision),
          description = COALESCE(?, description),
          is_assembly = COALESCE(?, is_assembly),
          production_count = COALESCE(?, production_count),
          total_production_hour = COALESCE(?, total_production_hour),
          total_administrative_hour = COALESCE(?, total_administrative_hour),
          unit_price = COALESCE(?, unit_price),
          updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `);

      update.run(
        drawing_number || null,
        revision || null,
        description || null,
        is_assembly !== undefined ? is_assembly : null,
        production_count !== undefined ? production_count : null,
        total_production_hour !== undefined ? total_production_hour : null,
        total_administrative_hour !== undefined ? total_administrative_hour : null,
        unit_price !== undefined ? unit_price : null,
        id
      );

      res.status(200).json({
        message: 'Part updated successfully',
        id: parseInt(id)
      });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
