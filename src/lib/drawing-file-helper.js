/**
 * drawing-file 查找辅助函数
 * 
 * 提供智能的图纸文件查找逻辑：
 * 1. 优先使用数据库已存储的 part_id 对应的文件
 * 2. 如果未存储，进行动态匹配
 * 3. 找到后，更新数据库记录，持久化结果
 */

/**
 * 查找图纸文件
 * 
 * @param {Database} db - SQLite数据库连接
 * @param {string} drawingNumber - 图纸号
 * @param {number|null} customerId - 可选的customer_id，用于精确匹配
 * @returns {Object|null} 返回 { id, file_path, file_name, ... } 或 null
 */
export function findDrawingFile(db, drawingNumber, customerId = null) {
  if (!drawingNumber) {
    return null;
  }

  // step 1: 优先查询已有 part_id 的记录
  // 如果提供了 customerId，可以通过 part 和 customer 的关联进行过滤
  let query = `
    SELECT 
      df.id, df.part_id, df.file_name, df.file_path, 
      df.is_active, df.last_modified_at, df.revision,
      df.created_at, df.updated_at
    FROM drawing_file df
    WHERE (df.file_name LIKE ? OR df.file_path LIKE ?)
      AND df.part_id IS NOT NULL
  `;
  const params = [`%${drawingNumber}%`, `%${drawingNumber}%`];

  // 如果提供了 customerId，添加客户过滤
  if (customerId) {
    query += `
      AND df.part_id IN (
        SELECT DISTINCT oi.part_id
        FROM order_item oi
        JOIN job j ON oi.job_id = j.id
        JOIN purchase_order po ON j.po_id = po.id
        JOIN customer_contact cc ON po.contact_id = cc.id
        WHERE cc.customer_id = ?
      )
    `;
    params.push(customerId);
  }

  query += ` ORDER BY df.is_active DESC, df.last_modified_at DESC LIMIT 1`;

  let result = db.prepare(query).get(...params);

  if (result) {
    return result;
  }

  // step 2: 如果没有已存储的记录，尝试动态匹配
  // 查询所有可能匹配的记录
  const candidates = db.prepare(`
    SELECT 
      id, part_id, file_name, file_path, is_active, last_modified_at
    FROM drawing_file
    WHERE (file_name LIKE ? OR file_path LIKE ?)
    ORDER BY is_active DESC, last_modified_at DESC
    LIMIT 1
  `).get(`%${drawingNumber}%`, `%${drawingNumber}%`);

  if (candidates) {
    // step 3: 尝试为此文件分配 part_id
    try {
      // 从 part 表查询对应的 part_id
      const part = db.prepare(`
        SELECT id, drawing_number
        FROM part
        WHERE drawing_number LIKE ?
        LIMIT 1
      `).get(`%${drawingNumber}%`);

      if (part) {
        // 更新 drawing_file，保存 part_id
        db.prepare(`
          UPDATE drawing_file
          SET part_id = ?, updated_at = datetime('now', 'localtime')
          WHERE id = ?
        `).run(part.id, candidates.id);

        candidates.part_id = part.id;
      }
    } catch (error) {
      console.warn(`Warning: Failed to update part_id for drawing_file[${candidates.id}]:`, error.message);
      // 继续返回结果，即使更新失败
    }

    return candidates;
  }

  return null;
}
