import getDB from '@/lib/db';

/**
 * GET /api/jobs/drawing-file-location
 * 
 * 根据图纸号和可选的客户名称获取图纸的文件位置。
 * 使用三步匹配策略：
 * 1. 在 drawings 表中按 drawing_number 直接匹配
 * 2. 如果提供了 customerName，按 drawing_name 进行模糊匹配，并使用客户文件夹映射
 * 3. 如果未提供 customerName，仅按 drawing_name 进行模糊匹配
 * 
 * 查询参数：
 * @param {string} drawingNumber - 必需。要搜索的图纸号（例如 "GM223-1314-9"）
 * @param {string} customerName - 可选。用于筛选模糊匹配的客户名称（例如 "MHI-Canada"）
 * 
 * 响应：
 * @returns {Object} JSON 响应，包含：
 *   - {string|null} fileLocation - 图纸的完整文件路径，如果未找到则为 null
 * 
 * 错误响应：
 * @returns {Object} 400 Bad Request - 缺少 drawingNumber 参数
 * @returns {Object} 500 Server Error - 数据库查询或系统错误
 * 
 * 示例：
 * GET /api/jobs/drawing-file-location?drawingNumber=GM223-1314-9&customerName=MHI-Canada
 * 返回: { fileLocation: "\\\\server\\MHI-Canada\\drawings\\GM223-1314-9.pdf" }
 * 
 * 使用的数据库表：
 * - drawings: 包含 drawing_number、drawing_name 和 file_location
 * - customer_folder_map: 将 customer_name 映射到 folder_name 以匹配路径
 */
export default function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { drawingNumber, customerName } = req.query;

      // 验证必需参数
      if (!drawingNumber) {
        return res.status(400).json({ error: 'drawingNumber query parameter is required' });
      }

      const db = getDB();
      let fileLocation = null;

      // 步骤 1: 在 drawings 表中按 drawing_number 直接匹配
      // 当 drawing_number 存在时，这是最精确的查找方式
      const directMatch = db.prepare(
        'SELECT file_location FROM drawings WHERE drawing_number = ?'
      ).get(drawingNumber);

      if (directMatch && directMatch.file_location) {
        fileLocation = directMatch.file_location;
      } else if (customerName) {
        // 步骤 2: 按 drawing_name 进行模糊匹配，并使用客户文件夹映射
        // 当 drawing_number 不存在但 drawing_name 包含它时提供灵活性

        // 获取客户特定的文件夹名称映射（如果存在）
        // 用于根据 file_location 路径进行更精确的匹配
        const folderMapResult = db.prepare(
          'SELECT folder_name FROM customer_folder_map WHERE customer_name = ?'
        ).get(customerName);

        // 如果映射的 folder_name 存在则使用它，否则回退到 customer_name
        const searchName = folderMapResult ? folderMapResult.folder_name : customerName;

        // 查询所有 drawing_name 包含 drawingNumber 的图纸
        // 按 drawing_name 排序以保证顺序一致
        const fuzzyMatches = db.prepare(
          'SELECT file_location FROM drawings WHERE drawing_name LIKE ? ORDER BY drawing_name'
        ).all(`%${drawingNumber}%`);

        // 查找第一个与客户路径匹配的有效 file_location
        for (const match of fuzzyMatches) {
          if (match.file_location) {
            // 检查 file_location 是否包含 customer_name 或映射的 folder_name
            const fileLocationLower = match.file_location.toLowerCase();
            const customerNameLower = customerName.toLowerCase();
            const searchNameLower = searchName.toLowerCase();

            if (
              fileLocationLower.includes(customerNameLower) ||
              fileLocationLower.includes(searchNameLower)
            ) {
              fileLocation = match.file_location;
              break;
            }
          }
        }
      } else {
        // 步骤 3: 按 drawing_name 进行模糊匹配，不进行客户过滤
        // 仅提供图纸号时使用

        const fuzzyMatches = db.prepare(
          'SELECT file_location FROM drawings WHERE drawing_name LIKE ? ORDER BY drawing_name LIMIT 1'
        ).get(`%${drawingNumber}%`);

        if (fuzzyMatches && fuzzyMatches.file_location) {
          fileLocation = fuzzyMatches.file_location;
        }
      }

      // 返回文件位置（如果未找到则返回 null）
      res.status(200).json({
        fileLocation: fileLocation || null
      });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
