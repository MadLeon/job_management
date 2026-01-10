/**
 * GET /api/jobs/drawing-file-location
 * 
 * 根据图纸号和可选的客户名称获取图纸的文件位置。
 * 使用简单的模糊匹配策略：
 * 1. 在 drawing_file 表中按 file_path 或 file_name 匹配
 * 2. 如果提供了 customerName，进行额外的路径过滤
 * 
 * 查询参数：
 * @param {string} drawingNumber - 必需。要搜索的图纸号（例如 "GM223-1314-9"）
 * @param {string} customerName - 可选。用于筛选文件位置的客户名称（例如 "MHI-Canada"）
 * 
 * 响应：
 * @returns {Object} JSON 响应，包含：
 *   - {string|null} fileLocation - 图纸的完整文件路径，如果未找到则为 null
 * 
 * 错误响应：
 * @returns {Object} 400 Bad Request - 缺少 drawingNumber 参数
 * @returns {Object} 500 Server Error - 数据库查询或系统错误
 */

import getDB from '@/lib/db';

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

      // 从 drawing_file 表中按 file_path 或 file_name 匹配
      const matches = db.prepare(`
        SELECT file_path FROM drawing_file 
        WHERE file_path LIKE ? OR file_name LIKE ?
        ORDER BY updated_at DESC
        LIMIT 10
      `).all(`%${drawingNumber}%`, `%${drawingNumber}%`);

      if (matches.length > 0) {
        if (customerName) {
          // 如果提供了客户名称，优先选择包含该客户名称的路径
          for (const match of matches) {
            if (match.file_path && match.file_path.toLowerCase().includes(customerName.toLowerCase())) {
              fileLocation = match.file_path;
              break;
            }
          }
        }
        
        // 如果未找到包含客户名称的路径，或未提供客户名称，使用第一个匹配
        if (!fileLocation && matches[0]) {
          fileLocation = matches[0].file_path;
        }
      }      res.status(200).json({ fileLocation });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
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
