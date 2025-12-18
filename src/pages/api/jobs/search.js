import getDB from '@/lib/db';

/**
 * 搜索任务和相关信息
 * 支持按以下字段搜索：
 * - job_number: 任务编号
 * - po_number: PO编号
 * - part_number: 零件号
 * - drawing_number: 图纸编号
 * 
 * @param {string} query - 搜索关键词
 * @returns {Array} 匹配的任务记录列表
 */
export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { q, limit = 20 } = req.query;

  // 验证查询参数
  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    return res.status(400).json({ error: 'Search query cannot be empty' });
  }

  try {
    const db = getDB();
    const searchTerm = `%${q.trim()}%`;
    const limitNum = parseInt(limit);

    // 从jobs表中搜索：job_number, po_number, part_number
    // 注意：同一个job_number可能对应多条记录（不同line_number），不进行去重
    const jobResults = db.prepare(`
      SELECT
        j.job_id,
        j.job_number,
        j.po_number,
        j.part_number,
        j.customer_name,
        j.line_number,
        j.unique_key,
        j.priority,
        j.create_timestamp,
        'job_number' as matched_field
      FROM jobs j
      WHERE 
        j.job_number LIKE ? 
        OR j.po_number LIKE ? 
        OR j.part_number LIKE ?
    `).all(searchTerm, searchTerm, searchTerm);

    // 从detail_drawing表搜索，通过assembly_detail与jobs关联
    const drawingResults = db.prepare(`
      SELECT
        j.job_id,
        j.job_number,
        j.po_number,
        j.part_number,
        j.customer_name,
        j.line_number,
        j.unique_key,
        j.priority,
        j.create_timestamp,
        'drawing_number' as matched_field
      FROM jobs j
      INNER JOIN assembly_detail ad ON j.part_number = ad.part_number
      INNER JOIN detail_drawing dd ON ad.drawing_number = dd.drawing_number
      WHERE dd.drawing_number LIKE ?
    `).all(searchTerm);

    // 合并结果，避免unique_key重复（同一记录不会重复出现）
    const mergedResults = [];
    const seenUniqueKeys = new Set();

    // 先加入job搜索结果
    for (const result of jobResults) {
      if (!seenUniqueKeys.has(result.unique_key)) {
        seenUniqueKeys.add(result.unique_key);
        mergedResults.push(result);
      }
    }

    // 再加入drawing搜索结果（避免相同unique_key）
    for (const result of drawingResults) {
      if (!seenUniqueKeys.has(result.unique_key)) {
        seenUniqueKeys.add(result.unique_key);
        mergedResults.push(result);
      }
    }

    res.status(200).json(mergedResults.slice(0, limitNum));
  } catch (error) {
    console.error('Search API error:', error);
    res.status(500).json({ error: error.message });
  }
}
