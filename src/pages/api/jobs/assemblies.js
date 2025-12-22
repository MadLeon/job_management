import getDB from '@/lib/db';

/**
 * API路由：获取装配细节
 * 
 * @description 根据零件号查询该零件对应的所有装配细节记录。
 * 通过LEFT JOIN关联detail_drawing表获取图纸元数据（描述、版本等）。
 * 
 * @route GET /api/jobs/assemblies
 * @param {Object} req - HTTP请求对象
 * @param {Object} req.query - 查询参数
 * @param {string} req.query.partNumber - 必需，零件号（用于查询装配细节）
 * @param {Object} res - HTTP响应对象
 * 
 * @returns {Object} 装配细节数组，包含以下字段：
 *   - id {number} - 装配细节ID
 *   - drawing_number {string} - 图纸号
 *   - description {string} - 图纸描述（来自detail_drawing表）
 *   - revision {string} - 图纸版本号
 *   - quantity {string} - 数量
 *   - status {string} - 状态
 *   - file_location {string} - 文件位置路径
 *   - delivery_required_date {string} - 所需交货日期（YYYY-MM-DD格式）
 * 
 * @throws {400} 当未提供partNumber参数时返回400错误
 * @throws {405} 当请求方法不是GET时返回405错误
 * @throws {500} 数据库操作失败时返回500错误及错误信息
 */
export default function handler(req, res) {
  // 检查HTTP方法是否为GET
  if (req.method === 'GET') {
    try {
      // 从查询参数中提取零件号
      const { partNumber } = req.query;

      // 验证零件号参数是否存在
      if (!partNumber) {
        return res.status(400).json({ error: 'partNumber query parameter is required' });
      }

      // 获取数据库单例实例
      const db = getDB();

      // 查询该零件对应的所有装配细节
      // 使用LEFT JOIN关联detail_drawing表以获取图纸元数据
      const assemblies = db.prepare(`
        SELECT 
          ad.id,
          ad.drawing_number, 
          dd.description, 
          dd.revision,
          ad.quantity,
          ad.status,
          ad.file_location,
          ad.updated_at,
          ad.delivery_required_date
        FROM assembly_detail ad
        LEFT JOIN detail_drawing dd ON ad.drawing_number = dd.drawing_number
        WHERE ad.part_number = ?
      `).all(partNumber);

      // 返回装配细节数据（成功响应，HTTP 200）
      res.status(200).json(assemblies);
    } catch (error) {
      // 捕获并记录错误信息
      console.error('API Error:', error);
      // 返回服务器内部错误（HTTP 500）
      res.status(500).json({ error: error.message });
    }
  } else {
    // 不支持的HTTP方法，返回405错误
    res.status(405).json({ error: 'Method not allowed' });
  }
}
