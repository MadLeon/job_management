import fs from 'fs';
import path from 'path';

/**
 * 迁移 007: 导入 G 盘扫描的图纸文件
 * 
 * 功能:
 * 1. 从 data/scan-results.json 读取扫描结果
 * 2. 验证数据完整性
 * 3. 批量导入到 drawing_file 表
 * 4. 生成导入统计报告
 * 
 * 初始状态: is_active = 0（文件需要后续处理和匹配）
 */

export const name = '007_import_drawing_files';

/**
 * UP: 导入图纸文件
 */
export function up(db) {
  console.log('\n📚 迁移 007: 导入 G 盘图纸文件');
  console.log('=====================================\n');

  // 1. 读取扫描结果
  const scanResultsPath = path.join(process.cwd(), 'data', 'scan-results.json');

  if (!fs.existsSync(scanResultsPath)) {
    console.error(`❌ 扫描结果文件不存在: ${scanResultsPath}`);
    throw new Error(`Missing scan results: ${scanResultsPath}`);
  }

  const scanData = JSON.parse(fs.readFileSync(scanResultsPath, 'utf-8'));
  const files = scanData.files || [];

  console.log(`📖 加载扫描结果`);
  console.log(`   • 扫描日期: ${scanData.scan_metadata.scan_date}`);
  console.log(`   • 总文件数: ${files.length}`);
  console.log(`   • 扫描耗时: ${scanData.scan_metadata.scan_duration_seconds} 秒\n`);

  // 2. 验证表存在
  const tableInfo = db.pragma('table_info(drawing_file)');
  if (!tableInfo || tableInfo.length === 0) {
    throw new Error('drawing_file 表不存在');
  }

  // 3. 清空现有数据（如果有）
  const countBefore = db.prepare('SELECT COUNT(*) as cnt FROM drawing_file').get().cnt;
  if (countBefore > 0) {
    console.log(`🧹 清空现有数据: ${countBefore} 条记录\n`);
    db.prepare('DELETE FROM drawing_file').run();
  }

  // 4. 准备插入语句
  const insertStmt = db.prepare(`
    INSERT INTO drawing_file (
      file_name,
      file_path,
      last_modified_at,
      is_active,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  // 5. 批量导入
  console.log(`⚙️  开始导入...\n`);

  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  const now = new Date().toISOString();

  // 事务处理
  const insertTransaction = db.transaction(() => {
    for (const file of files) {
      try {
        // 验证必填字段
        if (!file.file_name || !file.file_path || !file.last_modified_local) {
          errorCount++;
          errors.push({
            file: file.file_name || '未知',
            reason: '缺少必填字段'
          });
          continue;
        }

        // 验证路径长度
        if (file.file_path.length > 500) {
          errorCount++;
          errors.push({
            file: file.file_name,
            reason: '文件路径过长'
          });
          continue;
        }

        // 插入记录（is_active 初始值为 0）
        insertStmt.run(
          file.file_name,
          file.file_path,
          file.last_modified_local,
          0, // is_active = 0，文件初始状态为不活跃
          now,
          now
        );

        successCount++;

        // 定期输出进度
        if (successCount % 10000 === 0) {
          console.log(`   ✓ 已导入: ${successCount} 个文件`);
        }
      } catch (error) {
        errorCount++;

        // 捕获唯一性约束错误（如果有重复）
        if (error.message.includes('UNIQUE constraint failed')) {
          // 跳过重复项，不记录
        } else {
          errors.push({
            file: file.file_name || '未知',
            reason: error.message.substring(0, 80)
          });
        }
      }
    }
  });

  // 执行事务
  const startTime = Date.now();
  insertTransaction();
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // 6. 验证结果
  const finalCount = db.prepare('SELECT COUNT(*) as cnt FROM drawing_file').get().cnt;

  console.log(`\n✅ 导入完成！`);
  console.log(`\n📊 导入统计`);
  console.log(`   • 导入耗时: ${duration} 秒`);
  console.log(`   • 处理总数: ${successCount + errorCount}`);
  console.log(`   • 成功导入: ${successCount}`);
  console.log(`   • 导入失败: ${errorCount}`);
  console.log(`   • 成功率: ${((successCount / (successCount + errorCount)) * 100).toFixed(2)}%`);
  console.log(`   • 导入速度: ${(successCount / duration).toFixed(0)} 文件/秒`);
  console.log(`\n💾 数据库状态`);
  console.log(`   • drawing_file 表: ${finalCount} 条记录`);
  console.log(`   • is_active = 0: ${finalCount} 条（初始状态，待处理）\n`);

  // 7. 显示错误信息
  if (errors.length > 0) {
    console.log(`⚠️  错误信息（共 ${errors.length} 条，显示前 10 条）`);
    errors.slice(0, 10).forEach((err, i) => {
      console.log(`   [${i + 1}] ${err.file}`);
      console.log(`       原因: ${err.reason}`);
    });
    if (errors.length > 10) {
      console.log(`   ... 还有 ${errors.length - 10} 条错误\n`);
    }
  }

  console.log('=====================================\n');
}

/**
 * DOWN: 回滚迁移，删除所有导入的文件
 */
export function down(db) {
  console.log('\n⏮️  回滚迁移 007: 清空 drawing_file 表\n');

  const countBefore = db.prepare('SELECT COUNT(*) as cnt FROM drawing_file').get().cnt;
  console.log(`📊 清空前: ${countBefore} 条记录`);

  db.prepare('DELETE FROM drawing_file').run();

  const countAfter = db.prepare('SELECT COUNT(*) as cnt FROM drawing_file').get().cnt;
  console.log(`✓ 清空后: ${countAfter} 条记录\n`);
}
