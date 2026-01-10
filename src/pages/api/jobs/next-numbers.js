import getDB from '@/lib/db';

export default function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const db = getDB();

      // 获取最大的job_number
      const jobNumberResult = db.prepare(
        'SELECT MAX(CAST(job_number AS INTEGER)) as max_job_number FROM job'
      ).get();
      const maxJobNumber = jobNumberResult?.max_job_number || 0;
      const nextJobNumber = String(maxJobNumber + 1);

      // 获取最大的po编号 (从purchase_order表)
      const poNumberResult = db.prepare(
        "SELECT MAX(CAST(SUBSTR(po_number, -6) AS INTEGER)) as max_po_number FROM purchase_order WHERE po_number LIKE 'PO%'"
      ).get();
      const maxPONumber = poNumberResult?.max_po_number || 0;
      const nextPONumber = 'PO' + String(maxPONumber + 1).padStart(6, '0');

      res.status(200).json({
        nextJobNumber,
        nextPONumber,
      });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
