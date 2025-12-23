import getDB from '@/lib/db';

/**
 * 获取图纸详细信息 API
 *
 * 端点: GET /api/drawings/detail
 * 
 * 查询参数:
 *   - drawing_number (string, required): 图纸号，用于查询 detail_drawing 表
 *
 * 响应格式:
 *   成功: {
 *     drawing_id: number,
 *     drawing_number: string,
 *     description: string,
 *     revision: string,
 *     isAssembly: 0|1,
 *     created_at: string (YYYY-MM-DD),
 *     updated_at: string (YYYY-MM-DD)
 *   }
 *   
 *   失败: { error: string }
 *
 * @param {Object} req - HTTP 请求对象
 * @param {Object} req.query - 查询参数
 * @param {string} req.query.drawing_number - 图纸号
 * @param {Object} res - HTTP 响应对象
 * @returns {void} JSON 响应
 */
export default function handler(req, res) {
  // 仅允许 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { drawing_number } = req.query;

    // 验证必要参数
    if (!drawing_number) {
      return res.status(400).json({ error: 'drawing_number must be provided' });
    }

    // 获取数据库实例
    const db = getDB();

    // 查询 detail_drawing 表
    const drawing = db
      .prepare('SELECT * FROM detail_drawing WHERE drawing_number = ?')
      .get(drawing_number);

    if (!drawing) {
      return res.status(404).json({ error: `Drawing not found: ${drawing_number}` });
    }

    return res.status(200).json(drawing);
  } catch (error) {
    console.error('Error fetching drawing details:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch drawing details' });
  }
}
