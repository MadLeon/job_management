#!/usr/bin/env node

/**
 * 可复用脚本：根据part的drawing_number在drawing_file中进行智能匹配
 * 
 * 功能：
 * 1. 模糊匹配 drawing_number 在 file_name 列中的出现
 * 2. 使用 folder_mapping 表精确验证 customer 匹配
 * 3. 多个匹配结果时，保留 last_modified_at 最新的记录
 * 
 * 使用场景：
 * - 被迁移脚本调用
 * - 被 API 调用进行动态匹配
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

/**
 * 匹配part与drawing_file的主函数
 * 
 * @param {Object} db - Database实例
 * @param {Object} part - part对象，包含 { id, drawing_number, revision, ... }
 * @param {number} customer_id - 订单项所属的customer_id（用于folder_mapping验证）
 * @returns {Object} { success: boolean, file_id: number|null, confidence: string, reason: string }
 */
export function matchPartToDrawing(db, part, customer_id) {
  try {
    // 验证输入
    if (!part || !part.drawing_number) {
      return {
        success: false,
        file_id: null,
        confidence: 'none',
        reason: 'part缺少drawing_number'
      };
    }

    const drawing_number = part.drawing_number.trim();

    // step 1: 在drawing_file中模糊搜索file_name包含drawing_number的记录
    // 注意：忽略is_active的限制，后续会优先选择is_active=1的结果
    const fuzzyMatches = db.prepare(`
      SELECT 
        df.id,
        df.file_name,
        df.file_path,
        df.is_active,
        df.last_modified_at,
        df.created_at
      FROM drawing_file df
      WHERE df.file_name LIKE ?
      ORDER BY df.is_active DESC, df.last_modified_at DESC
    `).all(`%${drawing_number}%`);

    if (fuzzyMatches.length === 0) {
      return {
        success: false,
        file_id: null,
        confidence: 'none',
        reason: `drawing_file中未找到匹配"${drawing_number}"的file_name`
      };
    }

    // step 2: 如果customer_id存在，使用folder_mapping进行精确验证
    // 否则直接返回模糊匹配的最新记录
    if (!customer_id || customer_id === 0 || customer_id === null) {
      // 无customer_id时，直接返回模糊匹配的最新记录
      const bestMatch = fuzzyMatches[0];
      return {
        success: true,
        file_id: bestMatch.id,
        confidence: 'fuzzy',
        reason: `模糊匹配drawing_number，找到${fuzzyMatches.length}个结果，返回最新修改的记录(id=${bestMatch.id})`
      };
    }

    // step 2b: 有customer_id时，通过folder_mapping验证
    // 获取customer的G盘文件夹mapping
    const folderMapping = db.prepare(`
      SELECT folder_name
      FROM folder_mapping
      WHERE customer_id = ?
      LIMIT 1
    `).get(customer_id);

    if (!folderMapping) {
      // 无folder_mapping时，返回模糊匹配的最新记录
      const bestMatch = fuzzyMatches[0];
      return {
        success: true,
        file_id: bestMatch.id,
        confidence: 'fuzzy_no_folder',
        reason: `模糊匹配drawing_number，但customer(id=${customer_id})无folder_mapping，返回最新修改的记录(id=${bestMatch.id})`
      };
    }

    // step 3: 根据folder_mapping精确验证file_path是否在正确的文件夹
    const folder_name = folderMapping.folder_name.toLowerCase();
    const verifiedMatches = fuzzyMatches.filter(match => {
      // file_path格式可能是: "G:\customer_folder\..."
      // 检查file_path中是否包含folder_name
      const file_path_lower = (match.file_path || '').toLowerCase();
      return file_path_lower.includes(folder_name);
    });

    if (verifiedMatches.length === 0) {
      // folder_mapping验证失败，返回模糊匹配的最新
      const bestMatch = fuzzyMatches[0];
      return {
        success: true,
        file_id: bestMatch.id,
        confidence: 'fuzzy_folder_mismatch',
        reason: `模糊匹配drawing_number但folder_mapping验证失败(expected="${folder_name}")，返回模糊匹配的最新记录(id=${bestMatch.id})`
      };
    }

    // step 4: 多个已验证的匹配时，保留last_modified_at最新的
    const bestMatch = verifiedMatches[0];
    return {
      success: true,
      file_id: bestMatch.id,
      confidence: 'verified',
      reason: `通过folder_mapping验证成功，找到${verifiedMatches.length}个结果，返回最新修改的记录(id=${bestMatch.id})`
    };

  } catch (error) {
    return {
      success: false,
      file_id: null,
      confidence: 'error',
      reason: `匹配过程出错: ${error.message}`
    };
  }
}

/**
 * 从order_item中获取customer_id
 * 
 * @param {Object} db - Database实例
 * @param {number} order_item_id - order_item的id
 * @returns {number|null} customer_id
 */
export function getCustomerIdFromOrderItem(db, order_item_id) {
  try {
    const result = db.prepare(`
      SELECT cc.customer_id
      FROM order_item oi
      JOIN job j ON oi.job_id = j.id
      JOIN purchase_order po ON j.po_id = po.id
      JOIN customer_contact cc ON po.contact_id = cc.id
      WHERE oi.id = ?
      LIMIT 1
    `).get(order_item_id);

    return result?.customer_id || null;
  } catch (error) {
    console.error(`获取customer_id失败 (order_item_id=${order_item_id}):`, error.message);
    return null;
  }
}

/**
 * 命令行测试入口
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const dbPath = path.join(projectRoot, 'data', 'record.db');
  const db = new Database(dbPath);

  // 获取第一条order_item作为测试
  const firstOrderItem = db.prepare(`
    SELECT oi.id, oi.part_id, p.id as part_id_verify, p.drawing_number
    FROM order_item oi
    JOIN part p ON oi.part_id = p.id
    LIMIT 1
  `).get();

  if (!firstOrderItem) {
    console.log(`❌ order_item not found`);
    db.close();
    process.exit(1);
  }

  const testOrderItemId = firstOrderItem.id;

  console.log(`\n📊 测试匹配 order_item_id=${testOrderItemId}`);
  console.log(`   part_id=${firstOrderItem.part_id}, drawing_number=${firstOrderItem.drawing_number}`);

  const customer_id = getCustomerIdFromOrderItem(db, testOrderItemId);
  console.log(`   customer_id=${customer_id}`);

  const result = matchPartToDrawing(db, firstOrderItem, customer_id);
  console.log(`\n✓ 匹配结果:`, result);

  db.close();
}
