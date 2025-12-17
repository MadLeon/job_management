import getDB from '@/lib/db';

export default function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const db = getDB();

      // 获取最大的job_number
      const jobNumberResult = db.prepare(
        'SELECT MAX(CAST(job_number AS INTEGER)) as max_job_number FROM jobs'
      ).get();
      const maxJobNumber = jobNumberResult?.max_job_number || 0;
      const nextJobNumber = String(maxJobNumber + 1);

      // 获取最大的oe_number
      const oeNumberResult = db.prepare(
        'SELECT MAX(CAST(oe_number AS INTEGER)) as max_oe_number FROM jobs'
      ).get();
      const maxOENumber = oeNumberResult?.max_oe_number || 0;
      const nextOENumber = String(maxOENumber + 1);

      res.status(200).json({
        nextJobNumber,
        nextOENumber,
      });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
