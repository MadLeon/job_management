/**
 * 更新 Order Entry Log.csv 的第一列，添加新添加的30个 order item 的 ID
 * 针对 Job #73063-73092 的数据
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Papa from 'papaparse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// 配置常量
// ============================================================================

const CONFIG = {
  db_path: path.join(process.cwd(), 'data', 'record.db'),
  csv_path: path.join(process.cwd(), 'src', 'order entry log', 'Order Entry Log.csv'),
};

// ============================================================================
// 主函数
// ============================================================================

function main() {
  console.log('');
  console.log('🔄 更新 Order Entry Log.csv 第一列 (Order Item ID)');
  console.log('');

  let db;
  let updatedCount = 0;
  let notFoundCount = 0;

  try {
    // 连接数据库
    db = new Database(CONFIG.db_path);
    db.pragma('foreign_keys = ON');
    console.log('✓ 数据库连接成功');

    // 读取 CSV 文件
    if (!fs.existsSync(CONFIG.csv_path)) {
      throw new Error(`CSV文件不存在: ${CONFIG.csv_path}`);
    }

    const csvContent = fs.readFileSync(CONFIG.csv_path, 'utf-8');
    
    // 使用 papaparse 解析 CSV
    const parseResult = Papa.parse(csvContent, {
      header: false,
      skipEmptyLines: false,
      dynamicTyping: false,
    });

    const rows = parseResult.data;
    console.log(`✓ CSV读取成功，共 ${rows.length} 行`);

    // 处理每一行（从第2行开始，第1行是标题）
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      // 跳过空行
      if (!row || row.length === 0 || !row[1]?.trim()) {
        continue;
      }

      // 提取 Job # (第3列，索引2)
      const jobNumber = row[2]?.trim();

      if (!jobNumber) {
        continue;
      }

      // 查询数据库，找到对应 job 的 order_item ID
      try {
        const result = db.prepare(`
          SELECT oi.id
          FROM order_item oi
          JOIN job j ON oi.job_id = j.id
          WHERE j.job_number = ?
          LIMIT 1
        `).get(jobNumber);

        if (result) {
          // 更新第一列为 order_item_id
          row[0] = String(result.id);
          updatedCount++;
        } else {
          notFoundCount++;
        }
      } catch (error) {
        console.error(`行 ${i}: 查询失败 - ${error.message}`);
      }
    }

    // 保存更新后的 CSV
    console.log(`\n💾 保存 CSV 文件...`);
    
    // 使用 papaparse 的 unparse 重新生成 CSV
    const csvString = Papa.unparse(rows);
    fs.writeFileSync(CONFIG.csv_path, csvString, 'utf-8');
    console.log(`✅ CSV 文件已更新`);

    console.log('');
    console.log('📊 更新完成');
    console.log(`   ✓ 成功更新: ${updatedCount} 行`);
    console.log(`   ✗ 未找到: ${notFoundCount} 行`);
    console.log('');

  } catch (error) {
    console.error('❌ 处理失败:', error.message);
    process.exit(1);
  } finally {
    if (db) {
      db.close();
      console.log('✓ 数据库连接已关闭');
    }
  }
}

main();
