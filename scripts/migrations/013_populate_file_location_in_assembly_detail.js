/**
 * 迁移 013: 为 assembly_detail 表填充 file_location 字段
 * 
 * 为 assembly_detail 表中的每条记录填充 file_location。
 * 使用类似于迁移 005 的逻辑：
 * 1. 按 drawing_number 直接匹配
 * 2. 按 part_number 模糊匹配，使用客户文件夹映射进行精确化
 * 
 * 通过 jobs 表获取关联的 customer_name，以便进行客户特定的路径匹配。
 */

export const up = (db) => {
  // 获取所有 assembly_detail 行，同时关联 jobs 表获取 customer_name
  const assemblyDetails = db.prepare(`
    SELECT 
      ad.id, 
      ad.part_number, 
      ad.drawing_number,
      j.customer_name
    FROM assembly_detail ad
    LEFT JOIN jobs j ON ad.part_number = j.part_number
  `).all();

  let updatedCount = 0;

  for (const detail of assemblyDetails) {
    let fileLocation = null;

    // 步骤 1: 优先尝试按 drawing_number 直接匹配
    if (detail.drawing_number) {
      const directMatch = db.prepare(
        'SELECT file_location FROM drawings WHERE drawing_number = ?'
      ).get(detail.drawing_number);

      if (directMatch && directMatch.file_location) {
        fileLocation = directMatch.file_location;
      }
    }

    // 步骤 2: 如果直接匹配未找到，则按 part_number 或 drawing_number 进行模糊匹配
    if (!fileLocation) {
      const searchNumber = detail.drawing_number || detail.part_number;
      
      if (searchNumber && detail.customer_name) {
        // 获取 customer 的 folder_name（如果存在）
        const folderMapResult = db.prepare(
          'SELECT folder_name FROM customer_folder_map WHERE customer_name = ?'
        ).get(detail.customer_name);

        const searchName = folderMapResult ? folderMapResult.folder_name : detail.customer_name;

        // 查询所有包含 drawing_number 或 part_number 的 drawing
        const fuzzyMatches = db.prepare(
          'SELECT file_location FROM drawings WHERE drawing_name LIKE ? ORDER BY drawing_name'
        ).all(`%${searchNumber}%`);

        // 查找第一个有效的 file_location，并验证包含客户名称
        for (const match of fuzzyMatches) {
          if (match.file_location) {
            const fileLocationLower = match.file_location.toLowerCase();
            const customerNameLower = detail.customer_name.toLowerCase();
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
      } else if (searchNumber) {
        // 如果没有 customer_name，只做基础模糊匹配
        const fuzzyMatches = db.prepare(
          'SELECT file_location FROM drawings WHERE drawing_name LIKE ? ORDER BY drawing_name LIMIT 1'
        ).get(`%${searchNumber}%`);

        if (fuzzyMatches && fuzzyMatches.file_location) {
          fileLocation = fuzzyMatches.file_location;
        }
      }
    }

    // 更新 assembly_detail 表中的 file_location
    if (fileLocation) {
      db.prepare('UPDATE assembly_detail SET file_location = ? WHERE id = ?').run(
        fileLocation,
        detail.id
      );
      updatedCount++;
    }
  }

  console.log(`迁移 013 完成：已为 ${updatedCount} 条 assembly_detail 记录填充 file_location（共 ${assemblyDetails.length} 条）`);
};

export const down = (db) => {
  // 回滚：将 file_location 列的所有值设为 NULL
  db.prepare('UPDATE assembly_detail SET file_location = NULL').run();
  console.log('迁移 013 回滚：已清空所有 assembly_detail 的 file_location 数据');
};
