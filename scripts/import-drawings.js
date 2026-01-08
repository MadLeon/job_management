/**
 * 图纸文件导入脚本
 * 
 * 功能：
 * 1. 读取扫描结果JSON文件
 * 2. 验证数据完整性
 * 3. 批量导入到 record.db 的 drawing_file 表
 * 4. 生成导入报告
 * 
 * 用法：
 *   node scripts/import-drawings.js [--source data/scan-results.json] [--format json]
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 配置对象
 */
const config = {
  sourceFile: process.argv.find(arg => arg.startsWith('--source'))?.split('=')[1] || 'data/scan-results.json',
  format: process.argv.find(arg => arg.startsWith('--format'))?.split('=')[1] || 'json',
  dbPath: 'data/record.db',
  batchSize: 500 // 批量插入的大小
};

/**
 * 从JSON文件读取扫描结果
 */
function loadScanResults(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  if (!data.files || !Array.isArray(data.files)) {
    throw new Error('JSON格式错误：缺少files数组');
  }

  return data;
}

/**
 * 验证文件数据
 */
function validateFile(file) {
  const required = ['file_name', 'file_path', 'last_modified_local'];

  for (const field of required) {
    if (!file[field]) {
      return { valid: false, error: `缺少必填字段: ${field}` };
    }
  }

  // 验证路径有效性
  if (typeof file.file_path !== 'string' || file.file_path.length > 500) {
    return { valid: false, error: '无效的文件路径' };
  }

  // 验证文件大小
  if (file.file_size_bytes && (file.file_size_bytes < 0 || file.file_size_bytes > 10737418240)) { // 10GB
    return { valid: false, error: '文件大小不合理' };
  }

  return { valid: true };
}

/**
 * 导入文件到数据库
 */
function importToDatabase(scanResults) {
  const db = new Database(config.dbPath);

  console.log('📊 开始导入数据库...');
  console.log('');

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  const insertStmt = db.prepare(`
    INSERT INTO drawing_file (
      file_name,
      file_path,
      last_modified_at,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    for (const file of scanResults.files) {
      // 验证数据
      const validation = validateFile(file);
      if (!validation.valid) {
        errorCount++;
        errors.push({
          file: file.file_name,
          error: validation.error
        });
        continue;
      }

      try {
        insertStmt.run(
          file.file_name,
          file.file_path,
          file.last_modified_local,
          new Date().toISOString(),
          new Date().toISOString()
        );
        successCount++;

        // 定期输出进度
        if (successCount % 1000 === 0) {
          console.log(`  ✓ 已导入: ${successCount} 个文件`);
        }
      } catch (error) {
        errorCount++;
        if (error.message.includes('UNIQUE constraint failed')) {
          // 重复项，跳过
        } else {
          errors.push({
            file: file.file_name,
            error: error.message.substring(0, 100)
          });
        }
      }
    }
  });

  // 执行事务
  const startTime = Date.now();
  transaction();
  const duration = (Date.now() - startTime) / 1000;

  // 生成报告
  console.log('');
  console.log('✅ 导入完成！');
  console.log('');
  console.log('📊 导入统计：');
  console.log(`  • 导入耗时: ${duration.toFixed(2)} 秒`);
  console.log(`  • 总处理: ${successCount + errorCount} 个文件`);
  console.log(`  • 成功: ${successCount} 个`);
  console.log(`  • 失败: ${errorCount} 个`);
  console.log(`  • 平均速度: ${((successCount + errorCount) / duration).toFixed(0)} 文件/秒`);
  console.log('');

  // 数据库统计
  const dbCount = db.prepare('SELECT COUNT(*) as cnt FROM drawing_file').get();
  console.log('💾 数据库状态：');
  console.log(`  • drawing_file 表: ${dbCount.cnt} 条记录`);
  console.log('');

  // 显示错误信息
  if (errors.length > 0) {
    console.log('⚠️  错误信息（前10条）：');
    errors.slice(0, 10).forEach((err, i) => {
      console.log(`  [${i + 1}] ${err.file}`);
      console.log(`      ${err.error}`);
    });
    if (errors.length > 10) {
      console.log(`  ... 还有 ${errors.length - 10} 条错误`);
    }
    console.log('');
  }

  console.log('✨ 导入流程完成！');

  db.close();
  return { successCount, errorCount };
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('📚 图纸文件导入程序');
    console.log(`  源文件: ${config.sourceFile}`);
    console.log(`  数据库: ${config.dbPath}`);
    console.log('');

    // 1. 加载扫描结果
    console.log('📖 加载扫描结果...');
    const scanResults = loadScanResults(config.sourceFile);
    console.log(`  ✓ 加载完成: ${scanResults.files.length} 个文件`);
    console.log(`  ✓ 扫描日期: ${scanResults.scan_metadata.scan_date}`);
    console.log('');

    // 2. 导入数据库
    const result = importToDatabase(scanResults);

    // 3. 备份扫描历史（用于增量扫描）
    const historyPath = 'data/scan-history.json';
    const historyDir = path.dirname(historyPath);
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }

    // 保存扫描结果副本作为历史记录
    const historyData = {
      scans: [
        {
          scan_date: scanResults.scan_metadata.scan_date,
          file_count: scanResults.files.length,
          scan_file: config.sourceFile,
          timestamp: new Date().toISOString()
        }
      ]
    };

    if (fs.existsSync(historyPath)) {
      const existing = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
      historyData.scans = existing.scans || [];
      historyData.scans.push(historyData.scans[0]);
    }

    fs.writeFileSync(historyPath, JSON.stringify(historyData, null, 2), 'utf-8');

    // 4. 保存扫描结果为永久记录
    const archivePath = `data/scan-results-${new Date().toISOString().split('T')[0]}.json`;
    fs.copyFileSync(config.sourceFile, archivePath);
    console.log(`📁 扫描结果已保存: ${archivePath}`);

  } catch (error) {
    console.error('❌ 导入失败:', error.message);
    process.exit(1);
  }
}

main();
