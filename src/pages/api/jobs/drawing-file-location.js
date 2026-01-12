/**
 * GET /api/jobs/drawing-file-location
 * 
 * 根据图纸号和可选的客户名称获取图纸的文件位置。
 * 
 * 查询流程：
 * 1. 优先查询 drawing_file 表中已存储的 part_id 映射
 * 2. 如果未找到，尝试模糊匹配
 * 3. 找到后，如果 part_id 为空，自动更新数据库（持久化结果）
 * 
 * 查询参数：
 * @param {string} drawingNumber - 必需。要搜索的图纸号（例如 "GM223-1314-9"）
 * @param {string} customerName - 可选。用于筛选文件位置的客户名称（例如 "MHI-Canada"）
 * @param {number} customerId - 可选。客户ID，用于精确过滤
 * 
 * 响应：
 * @returns {Object} JSON 响应，包含：
 *   - {string|null} fileLocation - 图纸的完整文件路径，如果未找到则为 null
 *   - {number|null} partId - 对应的part_id
 * 
 * 错误响应：
 * @returns {Object} 400 Bad Request - 缺少 drawingNumber 参数
 * @returns {Object} 500 Server Error - 数据库查询或系统错误
 */

import getDB from '@/lib/db';
import { findDrawingFile } from '@/lib/drawing-file-helper';

export default function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { drawingNumber, customerName, customerId } = req.query;

      // 验证必需参数
      if (!drawingNumber) {
        return res.status(400).json({ error: 'drawingNumber query parameter is required' });
      }

      const db = getDB();

      // 使用智能查找函数
      const parsedCustomerId = customerId ? parseInt(customerId) : null;
      const drawing = findDrawingFile(db, drawingNumber, parsedCustomerId);

      let fileLocation = null;
      let partId = null;

      if (drawing) {
        fileLocation = drawing.file_path;
        partId = drawing.part_id;

        // 如果提供了 customerName，进行额外的路径验证
        if (customerName && fileLocation) {
          // 检查文件路径是否包含客户名称
          if (!fileLocation.toLowerCase().includes(customerName.toLowerCase())) {
            // 如果路径不匹配，尝试找其他匹配的文件
            const allMatches = db.prepare(`
              SELECT file_path, part_id FROM drawing_file 
              WHERE (file_path LIKE ? OR file_name LIKE ?)
              ORDER BY is_active DESC, last_modified_at DESC
              LIMIT 10
            `).all(`%${drawingNumber}%`, `%${drawingNumber}%`);

            for (const match of allMatches) {
              if (match.file_path && match.file_path.toLowerCase().includes(customerName.toLowerCase())) {
                fileLocation = match.file_path;
                partId = match.part_id;
                break;
              }
            }
          }
        }
      }

      // 返回文件位置和part_id
      res.status(200).json({
        fileLocation: fileLocation || null,
        partId: partId || null
      });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
