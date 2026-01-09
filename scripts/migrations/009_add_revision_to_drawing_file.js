/**
 * 迁移 009: 为 drawing_file 表添加 revision 字段
 * 
 * 这个迁移执行以下步骤：
 * 1. 为 drawing_file 表添加 revision 字段 (TEXT, DEFAULT '-')
 * 2. 初始化数据：从关联的 part 表复制 revision 值
 *    - 如果 part_id 有关联 → 使用 part.revision
 *    - 如果 part_id 为 NULL → 使用默认值 '-'
 * 3. 创建索引用于快速查询
 */

import Database from 'better-sqlite3';

export const name = '009_add_revision_to_drawing_file';

export function up(db) {
  const stats = {
    fieldAdded: false,
    recordsInitialized: 0,
    recordsWithPartId: 0,
    recordsWithoutPartId: 0,
    indexCreated: false,
    errors: []
  };

  console.log('📚 [009 迁移] 为 drawing_file 添加 revision 字段开始...');
  console.log('');

  try {
    // ============================================================
    // 第一步：检查字段是否已存在
    // ============================================================
    console.log('【1】检查字段状态...');

    const columns = db.pragma('table_info(drawing_file)');
    const revisionExists = columns.some(col => col.name === 'revision');

    if (revisionExists) {
      console.log('  ⊘ revision 字段已存在，跳过添加');
      stats.fieldAdded = true;
    } else {
      // ============================================================
      // 第二步：添加字段
      // ============================================================
      console.log('  ⚙ 添加 revision 字段...');

      db.exec(`
        ALTER TABLE drawing_file 
        ADD COLUMN revision TEXT NOT NULL DEFAULT '-'
      `);

      console.log('  ✓ revision 字段添加完成');
      stats.fieldAdded = true;
    }

    // ============================================================
    // 第三步：初始化数据
    // ============================================================
    console.log('\n【2】初始化 revision 数据...');

    // 统计信息
    const totalCount = db.prepare('SELECT COUNT(*) as cnt FROM drawing_file').get().cnt;
    console.log(`  ✓ 总记录数: ${totalCount}`);

    // 获取有 part_id 的记录数
    const withPartId = db.prepare(
      'SELECT COUNT(*) as cnt FROM drawing_file WHERE part_id IS NOT NULL'
    ).get().cnt;
    console.log(`  ✓ 有 part_id 的记录: ${withPartId}`);
    console.log(`  ✓ 无 part_id 的记录: ${totalCount - withPartId}`);

    // 从 part 表复制 revision
    console.log('\n  ⚙ 更新 revision 值 (从 part 表)...');

    const updateStmt = db.prepare(`
      UPDATE drawing_file
      SET revision = COALESCE(
        (SELECT revision FROM part WHERE part.id = drawing_file.part_id),
        '-'
      )
      WHERE revision = '-'
    `);

    updateStmt.run();

    const recordsUpdated = db.prepare('SELECT changes() as cnt').get().cnt;
    stats.recordsInitialized = recordsUpdated;

    console.log(`  ✓ 更新了 ${recordsUpdated} 条记录`);

    // 验证初始化结果
    const withValidRevision = db.prepare(
      "SELECT COUNT(*) as cnt FROM drawing_file WHERE revision != '-'"
    ).get().cnt;

    const withDefaultRevision = db.prepare(
      "SELECT COUNT(*) as cnt FROM drawing_file WHERE revision = '-'"
    ).get().cnt;

    console.log(`\n  初始化结果：`);
    console.log(`    - 有有效 revision: ${withValidRevision}`);
    console.log(`    - 默认值 '-': ${withDefaultRevision}`);

    stats.recordsWithPartId = withValidRevision;
    stats.recordsWithoutPartId = withDefaultRevision;

    // ============================================================
    // 第四步：创建索引
    // ============================================================
    console.log('\n【3】创建索引...');

    try {
      db.exec('CREATE INDEX idx_drawing_file_revision ON drawing_file(revision)');
      console.log('  ✓ 索引 idx_drawing_file_revision 创建完成');
      stats.indexCreated = true;
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('  ⊘ 索引已存在');
        stats.indexCreated = true;
      } else {
        throw error;
      }
    }

    // ============================================================
    // 第五步：显示 revision 分布统计
    // ============================================================
    console.log('\n【4】revision 分布统计...');

    const revisionDistribution = db.prepare(`
      SELECT revision, COUNT(*) as cnt
      FROM drawing_file
      GROUP BY revision
      ORDER BY cnt DESC
      LIMIT 15
    `).all();

    console.log(`  ✓ 总共有 ${revisionDistribution.length} 个不同的 revision`);
    console.log('\n  top 15 revision 分布:');
    revisionDistribution.forEach((row, index) => {
      const percentage = ((row.cnt / totalCount) * 100).toFixed(2);
      console.log(`    ${index + 1}. revision '${row.revision}': ${row.cnt} 条 (${percentage}%)`);
    });

    // ============================================================
    // 生成迁移报告
    // ============================================================
    console.log('\n' + '═'.repeat(60));
    console.log('【迁移总结】');
    console.log('═'.repeat(60));

    console.log(`\n✅ 字段添加: ${stats.fieldAdded ? '成功' : '失败'}`);
    console.log(`✅ 记录初始化: ${stats.recordsInitialized} 条`);
    console.log(`  - 从 part 表复制: ${stats.recordsWithPartId} 条`);
    console.log(`  - 使用默认值: ${stats.recordsWithoutPartId} 条`);
    console.log(`✅ 索引创建: ${stats.indexCreated ? '成功' : '失败'}`);

    if (stats.errors.length > 0) {
      console.log(`\n⚠️  错误: ${stats.errors.length} 条`);
      stats.errors.forEach(err => {
        console.log(`  - ${err}`);
      });
    } else {
      console.log(`\n✅ 无错误`);
    }

    console.log('');

  } catch (error) {
    throw new Error(`迁移 009 失败: ${error.message}`);
  }
}

export function down(db) {
  console.log('📚 [009 回滚] 删除 drawing_file 的 revision 字段...');

  try {
    // SQLite 不支持直接 DROP COLUMN，需要复杂的操作
    // 为了简单起见，我们记录警告而不是执行回滚

    console.log('  ⚠️  SQLite 不支持直接删除列');
    console.log('  需要手动恢复或重建数据库');
    console.log('  建议: 使用数据库备份恢复');

  } catch (error) {
    throw new Error(`回滚 009 失败: ${error.message}`);
  }
}
