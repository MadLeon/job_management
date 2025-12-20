/**
 * 迁移 010：确保Assemblies表包含所有来自Jobs表的装配件
 * 
 * @description
 * 第一步：从Jobs表中提取所有包含'-GA-'的零件号，确保它们都存在于Assemblies表中。
 * 这是数据完整性的基础 - 所有的源数据必须先在Assemblies表中完整。
 * 
 * 流程：
 * 1. 扫描Jobs表中所有不同的part_number
 * 2. 过滤出包含'-GA-'的装配件（共117个）
 * 3. 检查这些装配件是否存在于Assemblies表中
 * 4. 对于缺失的装配件，从Jobs表查询相关信息后添加到Assemblies表
 * 5. 确保每个装配件的part_number和drawing_number一致
 * 
 * @date 2025-12-19
 */

export const name = '010_ensure_all_jobs_assemblies_in_assemblies_table';

/**
 * 升级迁移：从Jobs表补全Assemblies表中的装配件
 * @param {Database} db - better-sqlite3数据库实例
 */
export function up(db) {
  try {
    console.log('开始迁移 010: 从Jobs表确保Assemblies表的完整性...');

    // 1. 获取Jobs表中所有不同的零件号
    const jobsParts = db.prepare(`
      SELECT DISTINCT part_number
      FROM jobs
      WHERE part_number IS NOT NULL AND part_number != ''
    `).all();

    console.log(`Jobs表中总的不同零件号: ${jobsParts.length}`);

    // 2. 过滤出包含'-GA-'的装配件
    const assemblyParts = jobsParts.filter(p => p.part_number.includes('-GA-'));
    console.log(`其中包含'-GA-'的装配件: ${assemblyParts.length}`);

    // 3. 获取Assemblies表中现有的零件号
    const existingAssemblies = db.prepare(`
      SELECT DISTINCT part_number FROM assemblies
    `).all();
    const existingPartNumbers = new Set(existingAssemblies.map(p => p.part_number));

    // 4. 找出缺失的装配件
    const missingAssemblies = assemblyParts.filter(
      p => !existingPartNumbers.has(p.part_number)
    );
    console.log(`缺失的装配件: ${missingAssemblies.length}`);

    // 5. 为每个缺失的装配件添加到Assemblies表
    const insertAssembly = db.prepare(`
      INSERT OR IGNORE INTO assemblies 
      (part_number, drawing_number, description, quantity)
      VALUES (?, ?, ?, '1')
    `);

    let addedCount = 0;
    for (const assembly of missingAssemblies) {
      const partNumber = assembly.part_number;

      // 从Jobs表查询该装配件的描述信息
      const jobInfo = db.prepare(`
        SELECT part_description, job_number
        FROM jobs
        WHERE part_number = ?
        LIMIT 1
      `).get(partNumber);

      const description = jobInfo?.part_description || partNumber;

      // 在Assemblies中，drawing_number应该等于part_number
      const result = insertAssembly.run(partNumber, partNumber, description);
      if (result.changes > 0) {
        addedCount++;
      }
    }

    console.log(`✓ 迁移完成: 添加 ${addedCount} 个装配件到Assemblies表`);
  } catch (error) {
    console.error('✗ 迁移失败:', error);
    throw error;
  }
}

/**
 * 回滚迁移：删除自动添加的装配件记录
 * @param {Database} db - better-sqlite3数据库实例
 */
export function down(db) {
  try {
    console.log('回滚迁移 010: 删除自动添加的装配件...');

    // 删除那些part_number = drawing_number的记录（这些是自动添加的）
    // 但要注意不删除原有的有效数据
    const result = db.prepare(`
      DELETE FROM assemblies
      WHERE part_number = drawing_number
      AND part_number LIKE '%GA%'
    `).run();

    console.log(`✓ 回滚完成: 删除 ${result.changes} 个装配件记录`);
  } catch (error) {
    console.error('✗ 回滚失败:', error);
    throw error;
  }
}
