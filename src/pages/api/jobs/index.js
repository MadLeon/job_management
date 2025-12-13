import getDB from '@/lib/db';

export default function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const db = getDB();
      const jobs = db.prepare('SELECT * FROM jobs').all();
      res.status(200).json(jobs);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}