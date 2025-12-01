import { getJobNumbers } from '../../lib/db.js';

export default async function handler(req, res) {
  try {
    const jobNumbers = await getJobNumbers();
    
    res.status(200).json({ jobs: jobNumbers });
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ error: 'Failed to fetch job numbers' });
  }
}