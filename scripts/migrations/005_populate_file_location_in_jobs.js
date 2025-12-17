export const up = (db) => {
  // 获取所有 jobs 行
  const jobs = db.prepare('SELECT job_id, part_number, customer_name FROM jobs').all();

  for (const job of jobs) {
    let fileLocation = null;

    // 步骤 1：直接匹配 drawing_number = part_number
    const directMatch = db.prepare(
      'SELECT file_location FROM drawings WHERE drawing_number = ?'
    ).get(job.part_number);

    if (directMatch && directMatch.file_location) {
      fileLocation = directMatch.file_location;
    } else {
      // 步骤 2：模糊匹配 + customer_folder_map 映射

      // 获取 customer 的 folder_name（如果存在）
      const folderMapResult = db.prepare(
        'SELECT folder_name FROM customer_folder_map WHERE customer_name = ?'
      ).get(job.customer_name);

      const searchName = folderMapResult ? folderMapResult.folder_name : job.customer_name;

      // 查询所有包含 part_number 的 drawing
      const fuzzyMatches = db.prepare(
        'SELECT file_location FROM drawings WHERE drawing_name LIKE ? ORDER BY drawing_name'
      ).all(`%${job.part_number}%`);

      // 查找第一个有效的 file_location
      for (const match of fuzzyMatches) {
        if (match.file_location) {
          // 检查 file_location 是否包含 customer_name 或 folder_name
          const fileLocationLower = match.file_location.toLowerCase();
          const customerNameLower = job.customer_name.toLowerCase();
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
    }

    // 更新 jobs 表中的 file_location
    if (fileLocation) {
      db.prepare('UPDATE jobs SET file_location = ? WHERE job_id = ?').run(
        fileLocation,
        job.job_id
      );
    }
  }

  console.log(`迁移 005 完成：已为 ${jobs.length} 行 jobs 填充 file_location`);
};

export const down = (db) => {
  // 回滚：将 file_location 列的所有值设为 NULL
  db.prepare('UPDATE jobs SET file_location = NULL').run();
  console.log('迁移 005 回滚：已清空所有 file_location 数据');
};
