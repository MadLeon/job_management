#!/usr/bin/env node

/**
 * 脚本名称：add-order-item-id.js
 * 功能：从order entry log - new.csv文件读取数据，根据job_number和line_number
 *       查询数据库中的order_item.id，然后更新CSV文件的"Order Item ID"列
 *
 * 逻辑：
 * 1. 根据job_number定位到job表中的行，获取job.id
 * 2. 在order_item表中根据job_id + line_number查询，获取order_item.id
 * 3. 将order_item.id写入到CSV的"Order Item ID"列
 *
 * 使用：
 *   node scripts/one-time-scripts/add-order-item-id.js
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// 配置常量
// ============================================================================

const CONFIG = {
  db_path: path.join(process.cwd(), 'data', 'record.db'),
  csv_path: path.join(process.cwd(), 'src', 'order entry log', 'order entry log - new.csv'),
  log_path: path.join(process.cwd(), 'scripts', 'logs', `add-order-item-id-${new Date().toISOString().split('T')[0]}.log`),
};

// ============================================================================
// 报告系统
// ============================================================================

class UpdateReport {
  constructor() {
    this.startTime = new Date();
    this.stats = {
      total_rows: 0,
      empty_rows_skipped: 0,
      matched: 0,
      not_found: 0,
      errors: [],
      warnings: [],
    };
    this.details = [];
  }

  addSuccess(rowIndex, jobNumber, lineNumber, orderItemId) {
    this.stats.matched++;
    this.details.push({
      type: 'matched',
      row: rowIndex,
      job_number: jobNumber,
      line_number: lineNumber,
      order_item_id: orderItemId,
    });
  }

  addNotFound(rowIndex, jobNumber, lineNumber) {
    this.stats.not_found++;
    this.details.push({
      type: 'not_found',
      row: rowIndex,
      job_number: jobNumber,
      line_number: lineNumber,
    });
  }

  addError(rowIndex, error) {
    const msg = error.message || error;
    this.stats.errors.push(`Row ${rowIndex}: ${msg}`);
    this.details.push({
      type: 'error',
      row: rowIndex,
      message: msg,
    });
  }

  addWarning(msg) {
    this.stats.warnings.push(msg);
  }

  print() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 Order Item ID 更新报告');
    console.log('='.repeat(80));
    console.log(`⏱️  耗时: ${(new Date() - this.startTime) / 1000}s`);
    console.log(`📈 统计数据:`);
    console.log(`   - 总行数: ${this.stats.total_rows}`);
    console.log(`   - 跳过的空行: ${this.stats.empty_rows_skipped}`);
    console.log(`   - 成功匹配: ${this.stats.matched}`);
    console.log(`   - 未找到: ${this.stats.not_found}`);
    console.log(`   - 错误: ${this.stats.errors.length}`);
    console.log(`   - 警告: ${this.stats.warnings.length}`);

    if (this.stats.errors.length > 0) {
      console.log(`\n❌ 错误详情:`);
      this.stats.errors.slice(0, 10).forEach(e => console.log(`   - ${e}`));
      if (this.stats.errors.length > 10) {
        console.log(`   ... 还有 ${this.stats.errors.length - 10} 个错误`);
      }
    }

    if (this.stats.warnings.length > 0) {
      console.log(`\n⚠️  警告详情:`);
      this.stats.warnings.forEach(w => console.log(`   - ${w}`));
    }

    console.log('='.repeat(80) + '\n');
  }

  save() {
    const logsDir = path.dirname(CONFIG.log_path);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const content = JSON.stringify(
      {
        timestamp: this.startTime.toISOString(),
        duration_ms: new Date() - this.startTime,
        stats: this.stats,
        details: this.details.slice(0, 200),
      },
      null,
      2
    );
    fs.writeFileSync(CONFIG.log_path, content);
    console.log(`📄 报告已保存至: ${CONFIG.log_path}`);
  }
}

// ============================================================================
// CSV处理函数
// ============================================================================

/**
 * 读取CSV文件
 * @returns {Array<Array<string>>} 行数据，每行为字符串数组
 */
function readCsv(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV文件不存在: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // 使用简单的CSV解析（处理有逗号分隔的值）
  return lines.map(line => {
    if (!line.trim()) {
      return null; // 空行标记为null
    }
    // 简单逗号分割（不处理引号内的逗号，假设CSV比较规范）
    return line.split(',').map(cell => cell.trim());
  });
}

/**
 * 检查行是否为空行
 * @param {Array<string>} row - CSV行数据
 * @returns {boolean} 是否为空行
 */
function isEmptyRow(row) {
  if (!row) return true;
  return row.every(cell => !cell || cell === '');
}

/**
 * 将行数据保存回CSV
 * @param {string} filePath - CSV文件路径
 * @param {Array<Array<string>>} rows - 行数据（包括标题行）
 */
function writeCsv(filePath, rows) {
  const content = rows.map(row => {
    if (!row) return ''; // 空行
    return row.join(',');
  }).join('\n');

  fs.writeFileSync(filePath, content, 'utf-8');
}

// ============================================================================
// 数据库查询函数
// ============================================================================

/**
 * 根据job_number和line_number查询order_item.id
 * 逻辑：
 * 1. 先根据job_number查询所有order_items
 * 2. 如果只有1条，直接返回
 * 3. 如果有多条，根据line_number（字符串）匹配，找不到则返回null
 * 
 * @param {Database} db - SQLite数据库实例
 * @param {string} jobNumber - Job编号
 * @param {string} lineNumber - 行号（字符串，可能包含字母或特殊符号）
 * @returns {number|null} order_item的id，未找到返回null
 */
function findOrderItemId(db, jobNumber, lineNumber) {
  try {
    // 步骤1：根据job_number查询所有order_items
    const allItemsQuery = `
      SELECT order_item.id, order_item.line_number
      FROM order_item
      JOIN job ON order_item.job_id = job.id
      WHERE job.job_number = ?
    `;

    const stmt = db.prepare(allItemsQuery);
    const allItems = stmt.all(jobNumber);

    // 如果没找到，返回null
    if (allItems.length === 0) {
      return null;
    }

    // 步骤2：如果只有1条，直接返回
    if (allItems.length === 1) {
      return allItems[0].id;
    }

    // 步骤3：有多条时，根据line_number（字符串）匹配
    // line_number可能包含字母或特殊符号，需要精确字符串匹配
    const lineNumberStr = String(lineNumber).trim();
    const matched = allItems.find(item => {
      const dbLineNum = String(item.line_number).trim();
      return dbLineNum === lineNumberStr;
    });

    return matched ? matched.id : null;

  } catch (error) {
    throw new Error(`数据库查询失败: ${error.message}`);
  }
}

// ============================================================================
// 主流程
// ============================================================================

/**
 * 主函数：执行Order Item ID更新
 */
function updateOrderItemIds() {
  const report = new UpdateReport();
  let db;

  try {
    // 连接数据库
    db = new Database(CONFIG.db_path);
    db.pragma('foreign_keys = ON');

    console.log('✓ 数据库连接成功');
    console.log(`📁 CSV文件: ${CONFIG.csv_path}`);

    // 读取CSV文件
    const rows = readCsv(CONFIG.csv_path);

    if (rows.length < 2) {
      console.log('⚠️  CSV文件少于2行');
      return report;
    }

    // 提取标题行
    const headers = rows[0];

    if (!headers) {
      throw new Error('无法读取CSV标题行');
    }

    // 列索引更新（Order Item ID列被插入到第1列）
    // Order Item ID在第1列（索引0）
    // Job #在第3列（索引2）
    // Line在第10列（索引9）
    const orderItemIdColIndex = 0;  // 第1列
    const jobNumberColIndex = 2;    // 第3列
    const lineNumberColIndex = 9;   // 第10列

    console.log(`✓ 列索引: OrderItemID at ${orderItemIdColIndex}, Job# at ${jobNumberColIndex}, LineNum at ${lineNumberColIndex}`);

    // 处理数据行（从第二行开始）
    let processedRows = 0;
    let emptyRowsSkipped = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      report.stats.total_rows++;

      // 检查是否为空行
      if (isEmptyRow(row)) {
        emptyRowsSkipped++;
        report.stats.empty_rows_skipped++;
        continue;
      }

      try {
        const jobNumber = row[jobNumberColIndex]?.trim() || '';
        const lineNumber = row[lineNumberColIndex]?.trim() || ''; // 保持为字符串

        // 跳过无效的job_number
        if (!jobNumber) {
          report.addWarning(`行${i + 1}: 缺少Job Number，跳过`);
          continue;
        }

        // 查询数据库
        const orderItemId = findOrderItemId(db, jobNumber, lineNumber);

        if (orderItemId) {
          // 更新CSV行
          row[orderItemIdColIndex] = String(orderItemId);
          report.addSuccess(i + 1, jobNumber, lineNumber, orderItemId);
          processedRows++;
        } else {
          report.addNotFound(i + 1, jobNumber, lineNumber);
        }
      } catch (error) {
        report.addError(i + 1, error);
      }
    }

    console.log(`\n✓ 已处理 ${processedRows} 行，跳过 ${emptyRowsSkipped} 个空行`);

    // 保存更新后的CSV
    console.log(`💾 保存CSV文件...`);
    writeCsv(CONFIG.csv_path, rows);
    console.log(`✅ CSV文件已更新`);

    report.print();
    report.save();

    return {
      success: true,
      report,
      processed: processedRows,
    };

  } catch (error) {
    console.error('❌ 处理失败:', error.message);
    report.addError(0, error);
    report.print();
    report.save();

    return {
      success: false,
      report,
      error: error.message,
    };

  } finally {
    if (db) {
      db.close();
      console.log('✓ 数据库连接已关闭');
    }
  }
}

// ============================================================================
// 入口点
// ============================================================================

async function main() {
  console.log('🚀 Order Item ID 更新脚本');
  console.log(`📁 数据库: ${CONFIG.db_path}`);

  const result = updateOrderItemIds();

  if (!result.success) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('致命错误:', err);
  process.exit(1);
});
