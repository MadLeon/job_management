import getDB from '@/lib/db';

export default function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { partNumber } = req.query;

      if (!partNumber) {
        return res.status(400).json({ error: 'partNumber query parameter is required' });
      }

      const db = getDB();
      const assemblies = db.prepare(`
        SELECT 
          ad.id,
          ad.drawing_number, 
          dd.description, 
          dd.revision,
          ad.quantity,
          ad.status,
          ad.file_location,
          ad.delivery_required_date
        FROM assembly_detail ad
        LEFT JOIN detail_drawing dd ON ad.drawing_number = dd.drawing_number
        WHERE ad.part_number = ?
      `).all(partNumber);

      res.status(200).json(assemblies);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
