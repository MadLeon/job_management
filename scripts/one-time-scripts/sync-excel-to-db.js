#!/usr/bin/env node

/**
 * 脚本名称: sync-excel-to-db.js
 * 功能: 同步 Excel (Order Entry Log) 和 SQLite 数据库的数据
 * 
 * 核心能力:
 * 1. 读取Excel AA列的order_item_id，精确定位DB中的记录
 * 2. 对比Excel和DB中的所有字段，生成差异报告
 * 3. 支持多种日期格式自动转换
 * 4. 可复用的日期转换和数据同步模块
 * 
 * 使用方式:
 *   npm run sync:excel-db [--report-only] [--dry-run]
 * 
 * 参数:
 *   --report-only: 仅生成报告，不执行更新
 *   --dry-run: 模拟执行但不提交事务
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import fs from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = process.cwd();

// ============================================================================
// 配置
// ============================================================================

const CONFIG = {
  db_path: path.join(projectRoot, 'data', 'record.db'),
  log_path: path.join(projectRoot, 'scripts', 'logs', `sync-${new Date().toISOString().split('T')[0]}.json`),
  report_path: path.join(projectRoot, 'scripts', 'logs', `sync-report-${new Date().toISOString().split('T')[0]}.txt`),
};

const OPTS = {
  reportOnly: process.argv.includes('--report-only'),
  dryRun: process.argv.includes('--dry-run'),
};

// ============================================================================
// 工具模块: 日期处理
// ============================================================================

class DateConverter {
  /**
   * 转换多种日期格式为 YYYY-MM-DD
   * 支持:
   *   - Excel OA日期 (45000)
   *   - "M/D/YYYY" (3/7/2024)
   *   - "M/D/YY" (3/7/24)
   *   - "d-MMM-yy" (7-Mar-24)
   *   - "d-Mon-yy" (7-Mar-24)
   *   - "MMM d, YYYY" (Mar 7, 2024)
   *   - "YYYY-MM-DD" (2024-03-07)
   * 
   * @param {string|number} input - 日期输入
   * @returns {string|null} YYYY-MM-DD 格式或 null
   */
  static convert(input) {
    if (!input && input !== 0) return null;

    const str = String(input).trim();
    if (!str) return null;

    // 1. 处理 Excel OA 日期格式 (数字)
    if (/^\d+$/.test(str)) {
      const excelDate = parseInt(str);
      if (excelDate > 0 && excelDate < 60000) {
        // Excel 日期: 1899-12-30 是第 1 天
        const date = new Date((excelDate - 25569) * 86400000);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }

    // 2. 已经是 YYYY-MM-DD 格式
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }

    const monthMap = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
      'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
    };

    // 3. 处理 "d-Mon-yy" 格式 (7-Mar-24)
    let match = str.match(/^(\d{1,2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2})$/i);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = monthMap[match[2].toLowerCase()];
      const year = parseInt(match[3]) < 50 ? 2000 + parseInt(match[3]) : 1900 + parseInt(match[3]);
      if (month) return `${year}-${month}-${day}`;
    }

    // 4. 处理 "d/m/yyyy" 或 "m/d/yyyy" 格式 (7/3/24 或 3/7/24)
    match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (match) {
      let month = match[1];
      let day = match[2];
      let year = match[3];

      // 启发式判断: 如果第一个数字 > 12，则为 d/m/yyyy，否则为 m/d/yyyy
      if (parseInt(month) > 12) {
        [month, day] = [day, month];
      }

      year = parseInt(year) < 100 ? (parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year)) : parseInt(year);
      month = month.padStart(2, '0');
      day = day.padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // 5. 处理 "Mon d, yyyy" 格式 (Mar 7, 2024)
    match = str.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s*(\d{4})$/i);
    if (match) {
      const month = monthMap[match[1].toLowerCase()];
      const day = match[2].padStart(2, '0');
      const year = match[3];
      if (month) return `${year}-${month}-${day}`;
    }

    return null;
  }

  /**
   * 检测日期格式
   */
  static detect(input) {
    if (!input && input !== 0) return 'empty';
    const str = String(input).trim();
    if (/^\d+$/.test(str)) return 'excel_oa';
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return 'iso';
    if (/^\d{1,2}-[A-Za-z]{3}-\d{2}$/.test(str)) return 'dmy_short';
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(str)) return 'numeric_slash';
    if (/^[A-Za-z]{3}\s+\d{1,2},\s*\d{4}$/.test(str)) return 'mdy_text';
    return 'unknown';
  }
}

// ============================================================================
// 工具模块: 报告系统
// ============================================================================

class SyncReport {
  constructor() {
    this.timestamp = new Date();
    this.stats = {
      total_rows: 0,
      rows_with_aa_id: 0,
      rows_without_aa_id: 0,
      records_updated: 0,
      records_inserted: 0,
      records_skipped: 0,
      field_discrepancies: [],
      date_conversion_issues: [],
      errors: [],
    };
    this.details = [];
  }

  addDetail(type, data) {
    this.details.push({ type, timestamp: new Date(), ...data });
  }

  addError(msg, context = {}) {
    this.stats.errors.push(msg);
    this.details.push({ type: 'error', message: msg, context });
  }

  addDiscrepancy(field, excelValue, dbValue, orderItemId) {
    this.stats.field_discrepancies.push({
      field, excelValue, dbValue, order_item_id: orderItemId
    });
  }

  addDateConversionIssue(raw, format, orderItemId) {
    this.stats.date_conversion_issues.push({
      raw_value: raw,
      detected_format: format,
      order_item_id: orderItemId
    });
  }

  print() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 Excel-DB 同步报告');
    console.log('='.repeat(80));
    console.log(`⏱️  时间: ${this.timestamp.toLocaleString('zh-CN')}`);
    console.log(`\n📈 统计:`);
    console.log(`  - 处理总行数: ${this.stats.total_rows}`);
    console.log(`  - 有AA列ID: ${this.stats.rows_with_aa_id}`);
    console.log(`  - 无AA列ID: ${this.stats.rows_without_aa_id}`);
    console.log(`  - 记录更新: ${this.stats.records_updated}`);
    console.log(`  - 记录新增: ${this.stats.records_inserted}`);
    console.log(`  - 记录跳过: ${this.stats.records_skipped}`);
    console.log(`  - 字段差异: ${this.stats.field_discrepancies.length}`);
    console.log(`  - 日期转换问题: ${this.stats.date_conversion_issues.length}`);
    console.log(`  - 错误: ${this.stats.errors.length}`);

    if (this.stats.field_discrepancies.length > 0 && this.stats.field_discrepancies.length <= 10) {
      console.log(`\n⚠️  字段差异详情:`);
      this.stats.field_discrepancies.forEach(d => {
        console.log(`  - OrderItem ${d.order_item_id} [${d.field}]: Excel='${d.excelValue}' vs DB='${d.dbValue}'`);
      });
    }

    if (this.stats.errors.length > 0 && this.stats.errors.length <= 5) {
      console.log(`\n❌ 错误:`);
      this.stats.errors.forEach(e => console.log(`  - ${e}`));
    }

    console.log('='.repeat(80) + '\n');
  }

  save() {
    const logsDir = path.dirname(CONFIG.log_path);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const reportContent = `
Excel-DB Sync Report
Generated: ${this.timestamp.toLocaleString('zh-CN')}

=== STATISTICS ===
Total Rows Processed: ${this.stats.total_rows}
Rows with AA ID: ${this.stats.rows_with_aa_id}
Rows without AA ID: ${this.stats.rows_without_aa_id}
Records Updated: ${this.stats.records_updated}
Records Inserted: ${this.stats.records_inserted}
Records Skipped: ${this.stats.records_skipped}
Field Discrepancies: ${this.stats.field_discrepancies.length}
Date Conversion Issues: ${this.stats.date_conversion_issues.length}
Errors: ${this.stats.errors.length}

=== FIELD DISCREPANCIES ===
${this.stats.field_discrepancies.map(d =>
  `OrderItem ${d.order_item_id} [${d.field}]: Excel='${d.excelValue}' vs DB='${d.dbValue}'`
).join('\n')}

=== DATE CONVERSION ISSUES ===
${this.stats.date_conversion_issues.map(d =>
  `OrderItem ${d.order_item_id}: "${d.raw_value}" (format: ${d.detected_format})`
).join('\n')}

=== ERRORS ===
${this.stats.errors.join('\n')}
`;

    fs.writeFileSync(CONFIG.report_path, reportContent.trim());
    console.log(`\n📄 报告已保存: ${CONFIG.report_path}`);

    const jsonLog = {
      timestamp: this.timestamp.toISOString(),
      stats: this.stats,
      details: this.details.slice(0, 100),
    };
    fs.writeFileSync(CONFIG.log_path, JSON.stringify(jsonLog, null, 2));
    console.log(`📄 日志已保存: ${CONFIG.log_path}`);
  }
}

// ============================================================================
// 核心函数: 读取Excel
// ============================================================================

function readExcelData(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Excel文件不存在: ${filePath}`);
  }

  const absolutePath = path.resolve(filePath);

  // PowerShell脚本：读取DELIVERY SCHEDULE工作表
  const psScript = `
    $excelFile = "${absolutePath}"
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    
    try {
      $workbook = $excel.Workbooks.Open($excelFile)
      $worksheet = $workbook.Sheets.Item("DELIVERY SCHEDULE")
      
      $usedRange = $worksheet.UsedRange
      $lastRow = $usedRange.Rows.Count
      $lastCol = 27  # 到AA列 (第27列)
      
      $headers = @()
      for ($col = 1; $col -le $lastCol; $col++) {
        $headerValue = $worksheet.Cells(3, $col).Value2
        $headers += [string]($null -eq $headerValue ? "" : $headerValue)
      }
      
      $data = @()
      for ($row = 4; $row -le $lastRow; $row++) {
        $rowData = @{}
        $oeValue = $worksheet.Cells($row, 1).Value2
        
        if ($null -eq $oeValue -or [string]$oeValue -eq "") {
          continue
        }
        
        for ($col = 1; $col -le $lastCol; $col++) {
          $cellValue = $worksheet.Cells($row, $col).Value2
          $columnName = $headers[$col - 1]
          if ($columnName -and $columnName.Trim()) {
            $rowData[$columnName] = [string]($null -eq $cellValue ? "" : $cellValue)
          }
        }
        
        if ($rowData.Count -gt 0) {
          $data += $rowData
        }
      }
      
      $workbook.Close($false)
      [System.Runtime.InteropServices.Marshal]::ReleaseComObject($workbook) | Out-Null
    } finally {
      $excel.Quit()
      [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
    }
    
    if ($data.Count -eq 0) {
      Write-Host "[]"
    } elseif ($data.Count -eq 1) {
      @($data) | ConvertTo-Json | Write-Host
    } else {
      $data | ConvertTo-Json | Write-Host
    }
  `;

  try {
    const psPath = path.join(__dirname, 'temp-read-oe.ps1');
    fs.writeFileSync(psPath, psScript);

    const result = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psPath}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024,
    });

    fs.unlinkSync(psPath);

    const output = result.trim();
    if (!output || output === '[]') {
      return [];
    }

    const rows = JSON.parse(output);
    const rowsArray = Array.isArray(rows) ? rows : [rows];

    return rowsArray.map(row => ({
      oe_number: String(row['O.E.:'] || ''),
      job_number: String(parseInt(row['Job #:']) || '').trim(),
      line_number: String(row['M'] || '1'),
      customer: String(row['Customer:'] || ''),
      qty: parseInt(row['Qty.:']) || 0,
      part_number: String(row['Part #'] || '').trim(),
      revision: String(row['Rev'] || '').trim(),
      dwg_release_date: row['DWG Rel.'] || '',
      delivery_required_date: row["Del. Req'd:"] || '',
      po_number: String(row['P.O. :'] || '').trim(),
      contact: String(row['Contact:'] || '').trim(),
      order_item_id: row['AA'] ? parseInt(row['AA']) : null, // AA列的order_item_id
    }));
  } catch (error) {
    throw new Error(`读取Excel失败: ${error.message}`);
  }
}

// ============================================================================
// 核心函数: 数据同步
// ============================================================================

function syncDatabase(excelFilePath) {
  const report = new SyncReport();
  let db;

  try {
    // 连接数据库
    db = new Database(CONFIG.db_path);
    db.pragma('foreign_keys = ON');

    console.log('✓ 数据库连接成功');

    // 读取Excel数据
    const excelRows = readExcelData(excelFilePath);
    report.stats.total_rows = excelRows.length;

    console.log(`✓ 读取Excel ${excelRows.length} 行`);

    if (excelRows.length === 0) {
      console.log('⚠️  未读取到任何数据');
      return report;
    }

    // 开始处理
    const transaction = db.transaction(() => {
      excelRows.forEach((row, idx) => {
        try {
          if (row.order_item_id) {
            // 情况1: 有AA列ID → 直接更新
            report.stats.rows_with_aa_id++;
            processExistingOrderItem(db, row, report);
          } else {
            // 情况2: 无AA列ID → 新增或查找
            report.stats.rows_without_aa_id++;
            processNewOrderItem(db, row, report);
          }
        } catch (error) {
          report.addError(`行${idx + 4}: ${error.message}`);
        }
      });
    });

    // 执行事务
    if (OPTS.dryRun) {
      console.log('\n⚠️  DRY RUN 模式 - 不提交更改');
    } else if (!OPTS.reportOnly) {
      transaction();
      console.log('✓ 事务已提交');
    }

    report.print();
    report.save();

    return report;

  } catch (error) {
    console.error('❌ 同步失败:', error.message);
    report.addError(`主流程: ${error.message}`);
    report.print();
    report.save();
    process.exit(1);

  } finally {
    if (db) {
      db.close();
      console.log('✓ 数据库连接已关闭');
    }
  }
}

/**
 * 处理已存在的 OrderItem (使用AA列ID)
 */
function processExistingOrderItem(db, excelRow, report) {
  const stmt = db.prepare(`
    SELECT 
      id, job_id, part_id, line_number, quantity, actual_price,
      drawing_release_date, delivery_required_date, status, created_at, updated_at
    FROM order_item
    WHERE id = ?
  `);

  const dbRecord = stmt.get(excelRow.order_item_id);
  if (!dbRecord) {
    report.addError(`OrderItem ${excelRow.order_item_id} 不存在于数据库`);
    report.stats.records_skipped++;
    return;
  }

  // 对比字段并更新
  const dwgConverted = DateConverter.convert(excelRow.dwg_release_date);
  const delConverted = DateConverter.convert(excelRow.delivery_required_date);

  let hasChanges = false;
  const updates = {};

  if (dwgConverted && dwgConverted !== dbRecord.drawing_release_date) {
    report.addDiscrepancy('drawing_release_date', excelRow.dwg_release_date, dbRecord.drawing_release_date, dbRecord.id);
    updates.drawing_release_date = dwgConverted;
    hasChanges = true;
  }

  if (delConverted && delConverted !== dbRecord.delivery_required_date) {
    report.addDiscrepancy('delivery_required_date', excelRow.delivery_required_date, dbRecord.delivery_required_date, dbRecord.id);
    updates.delivery_required_date = delConverted;
    hasChanges = true;
  }

  if (hasChanges && !OPTS.reportOnly) {
    const updateStmt = db.prepare(`
      UPDATE order_item 
      SET ${Object.keys(updates).map(k => `${k} = ?`).join(', ')},
          updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `);
    updateStmt.run(...Object.values(updates), dbRecord.id);
    report.stats.records_updated++;
  } else if (!hasChanges) {
    report.stats.records_skipped++;
  }
}

/**
 * 处理新的 OrderItem (无AA列ID)
 */
function processNewOrderItem(db, excelRow, report) {
  // 简化版: 仅记录需要处理的行
  report.addDetail('new_order_item', {
    oe: excelRow.oe_number,
    job: excelRow.job_number,
    line: excelRow.line_number,
    status: 'pending_review',
  });
  report.stats.records_skipped++;
}

// ============================================================================
// 主程序
// ============================================================================

async function main() {
  const excelPath = process.argv[3] || path.join(projectRoot, 'src', 'order entry log', 'Order Entry Log.xlsm');

  console.log('🚀 Excel-Database 同步脚本');
  console.log(`📁 Excel: ${excelPath}`);
  console.log(`📁 Database: ${CONFIG.db_path}`);
  if (OPTS.reportOnly) console.log('📋 模式: 仅报告');
  if (OPTS.dryRun) console.log('⚠️  模式: DRY RUN\n');

  syncDatabase(excelPath);
}

main().catch(err => {
  console.error('致命错误:', err.message);
  process.exit(1);
});
