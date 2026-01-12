/**
 * 获取图纸详细信息 API
 *
 * 端点: GET /api/drawings/detail
 * 
 * 查询参数:
 *   - drawing_number (string, required): 图纸号，用于查询 drawing_file 表
 *
 * 响应格式:
 *   成功: {
 *     id: number,
 *     part_id: number,
 *     file_name: string,
 *     file_path: string,
 *     is_active: 0|1,
 *     last_modified_at: string,
 *     revision: string,
 *     created_at: string,
 *     updated_at: string
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

import getDB from '@/lib/db';
import { findDrawingFile } from '@/lib/drawing-file-helper';

export default function handler(req, res) {
  // 仅允许 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { drawing_number, customer_id } = req.query;

    // 验证必要参数
    if (!drawing_number) {
      return res.status(400).json({ error: 'drawing_number must be provided' });
    }

    // 获取数据库实例
    const db = getDB();

    // 使用智能查找函数
    const drawing = findDrawingFile(db, drawing_number, customer_id ? parseInt(customer_id) : null);

    if (!drawing) {
      return res.status(404).json({ error: `Drawing not found: ${drawing_number}` });
    }

    return res.status(200).json(drawing);
  } catch (error) {
    console.error('Error fetching drawing details:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch drawing details' });
  }
}
