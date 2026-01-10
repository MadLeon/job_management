/**
 * API: GET /api/jobs/search
 * 
 * 搜索作业和相关信息
 * 支持按以下字段搜索：
 * - job_number: 作业编号
 * - po_number: PO编号
 * - drawing_number: 图纸编号
 * - customer_name: 客户名称
 *
 * @param {string} q - 搜索关键词
 * @returns {Array} 匹配的作业记录列表
 */

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { q, limit = 20 } = req.query;

  // 验证查询参数
  if (!q || typeof q !== "string" || q.trim().length === 0) {
    return res.status(400).json({ error: "Search query cannot be empty" });
  }

  try {
    const db = require('@/lib/db').default();
    const searchTerm = `%${q.trim()}%`;
    const limitNum = parseInt(limit);

    console.log(
      `[Search API] 搜索关键词: "${q.trim()}", searchTerm: "${searchTerm}"`
    );

    // 从job+order_item+part表中搜索：job_number, po_number, drawing_number
    const jobResults = db
      .prepare(
        `
      SELECT
        j.id as job_id,
        j.job_number,
        po.po_number,
        p.drawing_number,
        c.customer_name,
        oi.line_number,
        j.priority,
        j.created_at
      FROM job j
      LEFT JOIN purchase_order po ON j.po_id = po.id
      LEFT JOIN order_item oi ON j.id = oi.job_id
      LEFT JOIN part p ON oi.part_id = p.id
      LEFT JOIN customer_contact cc ON po.contact_id = cc.id
      LEFT JOIN customer c ON cc.customer_id = c.id
      WHERE 
        j.job_number LIKE ? 
        OR po.po_number LIKE ? 
        OR p.drawing_number LIKE ?
        OR c.customer_name LIKE ?
      LIMIT ?
    `
      )
      .all(searchTerm, searchTerm, searchTerm, searchTerm, limitNum);

    console.log(`[Search API] Job results: ${jobResults.length}`);

    res.status(200).json(jobResults);
  } catch (error) {
    console.error("Search API error:", error);
    res.status(500).json({ error: error.message });
  }
}
