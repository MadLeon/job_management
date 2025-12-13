/**
 * 迁移: 001_add_priority_column_to_jobs_table
 * 为 jobs 表添加 priority 列
 */

export const name = '001_add_priority_column_to_jobs_table';
export function up(db) {
  // 检查列是否已存在
  const columns = db.pragma('table_info(jobs)');
  const hasColumn = columns.some(col => col.name === 'priority');
  
  if (!hasColumn) {
    db.exec(`
      ALTER TABLE jobs ADD COLUMN priority TEXT DEFAULT 'Normal';
    `);
    console.log('✓ 为 jobs 表添加 priority 列');
  } else {
    console.log('⊘ priority 列已存在');
  }
}

export function down(db) {
  db.exec(`ALTER TABLE jobs DROP COLUMN priority`);
  console.log('✓ 删除 priority 列');
}
