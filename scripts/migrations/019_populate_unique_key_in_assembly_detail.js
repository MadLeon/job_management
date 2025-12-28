/**
 * 迁移: 补全 assembly_detail 表的 unique_key 字段
 * name: 019_populate_unique_key_in_assembly_detail
 * up: 遍历 assembly_detail，查找 jobs 表中对应 part_number，填充 unique_key
 * down: 清空 unique_key 字段内容
 */

export const name = '019_populate_unique_key_in_assembly_detail';

/**
 * 补全 unique_key 字段
 * @param {import('better-sqlite3').Database} db
 */
export function up(db) {
  // 查询所有 assembly_detail 记录
  const rows = db.prepare('SELECT id, part_number FROM assembly_detail').all();
  const update = db.prepare('UPDATE assembly_detail SET unique_key = ? WHERE id = ?');
  for (const row of rows) {
    // 查找 jobs 表中第一个匹配的 unique_key
    const job = db.prepare('SELECT unique_key FROM jobs WHERE part_number = ? LIMIT 1').get(row.part_number);
    if (job && job.unique_key) {
      update.run(job.unique_key, row.id);
    } else {
      // 未找到则置为 NULL
      update.run(null, row.id);
    }
  }
}

/**
 * 回滚: 清空 unique_key 字段内容
 * @param {import('better-sqlite3').Database} db
 */
export function down(db) {
  db.exec('UPDATE assembly_detail SET unique_key = NULL');
}
