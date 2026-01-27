#!/usr/bin/env node

/**
 * 脚本名称：update-oe-database.js
 * 功能：根据Order Entry Log.xlsm中的DELIVERY SCHEDULE数据，
 *      与record.db数据库同步，并填充order_item_id到AA列
 * 
 * 核心场景：
 * 1. 行已存在于DB → 更新AA列的order_item_id
 * 2. 行不存在于DB → 级联插入新记录，填充order_item_id
 * 3. DB中的PO不在OE → 标记is_active=0
 * 
 * 回滚机制：
 * - 事务管理确保原子性
 * - 错误发生时自动回滚所有更改和状态标志
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// 配置常量
// ============================================================================

const CONFIG = {
  db_path: path.join(process.cwd(), 'data', 'record.db'),
  log_path: path.join(process.cwd(), 'scripts', 'logs', `oe-sync-${new Date().toISOString().split('T')[0]}.log`),
};

// ============================================================================
// 日志和报告系统
// ============================================================================

class SyncReport {
  constructor() {
    this.startTime = new Date();
    this.stats = {
      total_rows: 0,
      matched_existing: 0,
      inserted_new: 0,
      updated_order_item_id: 0,
      marked_inactive: 0,
      excel_cells_updated: 0,
      errors: [],
      warnings: [],
    };
    this.details = [];
  }

  addSuccess(type, data) {
    this.details.push({ type, status: 'success', ...data });
    if (type === 'matched') this.stats.matched_existing++;
    if (type === 'inserted') this.stats.inserted_new++;
    if (type === 'updated_id') this.stats.updated_order_item_id++;
    if (type === 'marked_inactive') this.stats.marked_inactive++;
  }

  addError(type, error, data = {}) {
    const msg = `[${type}] ${error.message || error}`;
    this.details.push({ type, status: 'error', message: msg, ...data });
    this.stats.errors.push(msg);
  }

  addWarning(msg, data = {}) {
    this.details.push({ type: 'warning', status: 'warning', message: msg, ...data });
    this.stats.warnings.push(msg);
  }

  print() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 数据库同步报告');
    console.log('='.repeat(80));
    console.log(`⏱️  耗时: ${(new Date() - this.startTime) / 1000}s`);
    console.log(`📈 统计数据:`);
    console.log(`   - 处理总行数: ${this.stats.total_rows}`);
    console.log(`   - 已有记录更新: ${this.stats.matched_existing}`);
    console.log(`   - 新增记录: ${this.stats.inserted_new}`);
    console.log(`   - 填充order_item_id: ${this.stats.updated_order_item_id}`);
    console.log(`   - 标记过期PO: ${this.stats.marked_inactive}`);
    console.log(`   - ✅ Excel AA列已更新: ${this.stats.excel_cells_updated} 个单元格`);
    console.log(`   - 错误: ${this.stats.errors.length}`);
    console.log(`   - 警告: ${this.stats.warnings.length}`);
    if (this.stats.errors.length > 0) {
      console.log(`\n❌ 错误详情:`);
      this.stats.errors.forEach(e => console.log(`   - ${e}`));
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
        details: this.details.slice(0, 100), // 只保存前100条详情
      },
      null,
      2
    );
    fs.writeFileSync(CONFIG.log_path, content);
    console.log(`\n📄 报告已保存至: ${CONFIG.log_path}`);
  }
}

// ============================================================================
// 核心函数
// ============================================================================

/**
 * 从Excel文件读取DELIVERY SCHEDULE数据
 * 使用PowerShell的COM对象读取（Windows环境）
 * 
 * OE文件列结构:
 * A: O.E., B: Job #, C: Customer, D: Qty, E: Part #, F: Rev, G: Contact,
 * H: DWG Rel., I: M (Line Number), J: Descriptions, K: Price, L: P.O.,
 * M: Packing Slip, N: Qty, O: Invoice, P: Del. Req'd, Q: Del. Ship'd, R: Delay
 * 
 * 返回: 行数据数组 [{ oe_number, job_number, customer, ... }, ...]
 */
function readExcelData(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Excel文件不存在: ${filePath}`);
  }

  // 转换为绝对路径
  const absolutePath = path.resolve(filePath);

  // 使用PowerShell读取Excel数据
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
      $lastCol = 18  # 只需要前18列
      
      # 读取表头（第3行）
      $headers = @()
      for ($col = 1; $col -le $lastCol; $col++) {
        $headerValue = $worksheet.Cells(3, $col).Value2
        if ($null -eq $headerValue) {
          $headers += ""
        } else {
          $headers += [string]$headerValue
        }
      }
      
      # 读取数据行（从第4行开始）
      $data = @()
      for ($row = 4; $row -le $lastRow; $row++) {
        $rowData = @{}
        $oeValue = $worksheet.Cells($row, 1).Value2
        
        # 如果O.E.列为空，跳过这一行
        if ($null -eq $oeValue -or [string]$oeValue -eq "") {
          continue
        }
        
        for ($col = 1; $col -le $lastCol; $col++) {
          $cellValue = $worksheet.Cells($row, $col).Value2
          $columnName = $headers[$col - 1]
          if ($columnName -and $columnName.Trim()) {
            if ($null -eq $cellValue) {
              $rowData[$columnName] = ""
            } else {
              # 保留原始数据类型：日期为数字，数字为数字，文本为文本
              $rowData[$columnName] = $cellValue
            }
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
    
    # 输出JSON
    if ($data.Count -eq 0) {
      Write-Host "[]"
    } elseif ($data.Count -eq 1) {
      @($data) | ConvertTo-Json | Write-Host
    } else {
      $data | ConvertTo-Json | Write-Host
    }
  `;

  try {
    // 使用临时文件方式而不是命令行，避免转义问题
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

    // 规范化列名和数据（使用实际列名）
    return rowsArray.map(row => ({
      oe_number: String(row['O.E.:'] || ''),
      line_number: String(row['M'] || '1'),
      job_number: String(row['Job #:'] || ''),
      customer: String(row['Customer:'] || ''),
      qty: parseInt(row['Qty.:']) || 0,
      part_number: String(row['Part #'] || '').trim(),
      revision: String(row['Rev'] || '').trim(),
      contact: String(row['Contact:'] || '').trim(),
      dwg_release_date: row['DWG Rel.'] || '',
      description: String(row['Descriptions:'] || ''),
      price: parseFloat(row['Price:']) || 0,
      po_number: String(row['P.O. :'] || '').trim(),
      packing_slip: String(row['Packing Slip'] || ''),
      invoice_number: String(row['Invoice:'] || ''),
      delivery_required_date: row["Del. Req'd:"] || '',
      delivery_shipped_date: String(row["Del. Ship'd:"] || ''),
      delay: parseInt(row['Delay:']) || 0,
    }));
  } catch (error) {
    throw new Error(`读取Excel失败: ${error.message}`);
  }
}

/**
 * 生成临时PO号
 * 格式: NPO-{YYYYMMDD}-{公司名}-{当天序号}
 */
function generateTempPoNumber(customerName, existingPoNumbers = []) {
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');

  // 统计当天该客户的NPO单数
  const prefix = `NPO-${today}-${customerName.substring(0, 20).toUpperCase()}`;
  const sameDayPos = existingPoNumbers.filter(po => po.startsWith(prefix));
  const sequence = sameDayPos.length + 1;

  return `${prefix}-${String(sequence).padStart(2, '0')}`;
}

/**
 * 查询行是否存在于数据库
 * 使用 (oe_number, line_number) 组合作为唯一标识
 */
function findOrderItem(db, oeNumber, lineNumber, deliveryDate = null) {
  let query = `
    SELECT order_item.id, order_item.job_id
    FROM order_item
    JOIN job ON order_item.job_id = job.id
    JOIN purchase_order ON job.po_id = purchase_order.id
    WHERE purchase_order.oe_number = ?
      AND order_item.line_number = ?
  `;

  const params = [oeNumber, lineNumber];

  // 可选：加上delivery_date约束
  if (deliveryDate) {
    query += ` AND order_item.delivery_required_date = ?`;
    params.push(deliveryDate);
  }

  try {
    const stmt = db.prepare(query);
    const result = stmt.get(...params);
    return result || null;
  } catch (error) {
    throw new Error(`查询order_item失败: ${error.message}`);
  }
}

/**
 * 级联插入新记录
 * 按顺序: customer → customer_contact → purchase_order → job → part → order_item
 * 
 * @param {Database} db - SQLite数据库实例
 * @param {Object} rowData - 来自Excel的一行数据
 * @returns {number} 新插入的order_item.id，或null失败
 */
function insertNewOrderItem(db, rowData) {
  try {
    // ===== 步骤1: 处理或创建PO号 =====
    let poNumber = rowData.po_number || '';

    // 如果PO为空或"npo"，生成临时PO
    if (!poNumber || poNumber.toLowerCase() === 'npo') {
      // 获取当天已存在的临时PO数量
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const customerName = (rowData.customer || 'UNKNOWN').substring(0, 20).toUpperCase();
      const prefix = `NPO-${today}-${customerName}`;

      // 查询当天该客户的临时PO数量
      const stmt = db.prepare(`
        SELECT COUNT(*) as cnt FROM purchase_order 
        WHERE po_number LIKE ? AND po_number LIKE 'NPO-%'
      `);
      const result = stmt.get(`${prefix}%`);
      const sequence = (result?.cnt || 0) + 1;

      poNumber = `${prefix}-${String(sequence).padStart(2, '0')}`;
    }

    // ===== 步骤2: 查找或创建Customer =====
    let customerId = null;
    const findCustomerStmt = db.prepare(`SELECT id FROM customer WHERE customer_name = ? LIMIT 1`);
    let customer = findCustomerStmt.get(rowData.customer);

    if (customer) {
      customerId = customer.id;
    } else {
      const insertCustomerStmt = db.prepare(`
        INSERT INTO customer (customer_name, usage_count, created_at, updated_at)
        VALUES (?, 1, datetime('now', 'localtime'), datetime('now', 'localtime'))
      `);
      const insertResult = insertCustomerStmt.run(rowData.customer);
      customerId = insertResult.lastInsertRowid;
    }

    // ===== 步骤3: 查找或创建Customer Contact =====
    let contactId = null;
    const findContactStmt = db.prepare(`
      SELECT id FROM customer_contact 
      WHERE customer_id = ? AND contact_name = ? LIMIT 1
    `);
    let contact = findContactStmt.get(customerId, rowData.contact);

    if (contact) {
      contactId = contact.id;
    } else {
      const insertContactStmt = db.prepare(`
        INSERT INTO customer_contact (customer_id, contact_name, usage_count, created_at, updated_at)
        VALUES (?, ?, 1, datetime('now', 'localtime'), datetime('now', 'localtime'))
      `);
      const insertResult = insertContactStmt.run(customerId, rowData.contact);
      contactId = insertResult.lastInsertRowid;
    }

    // ===== 步骤4: 查找或创建Purchase Order =====
    let poId = null;
    const findPoStmt = db.prepare(`SELECT id FROM purchase_order WHERE po_number = ? LIMIT 1`);
    let po = findPoStmt.get(poNumber);

    if (po) {
      poId = po.id;
      // 更新PO的oe_number（如果之前为空）
      if (!po.oe_number && rowData.oe_number) {
        const updatePoStmt = db.prepare(`
          UPDATE purchase_order SET oe_number = ?, updated_at = datetime('now', 'localtime') WHERE id = ?
        `);
        updatePoStmt.run(rowData.oe_number, poId);
      }
    } else {
      const insertPoStmt = db.prepare(`
        INSERT INTO purchase_order (po_number, oe_number, contact_id, is_active, created_at, updated_at)
        VALUES (?, ?, ?, 1, datetime('now', 'localtime'), datetime('now', 'localtime'))
      `);
      const insertResult = insertPoStmt.run(poNumber, rowData.oe_number, contactId);
      poId = insertResult.lastInsertRowid;
    }

    // ===== 步骤5: 查找或创建Job =====
    let jobId = null;
    const findJobStmt = db.prepare(`SELECT id FROM job WHERE job_number = ? LIMIT 1`);
    let job = findJobStmt.get(rowData.job_number);

    if (job) {
      jobId = job.id;
    } else {
      const insertJobStmt = db.prepare(`
        INSERT INTO job (job_number, po_id, priority, created_at, updated_at)
        VALUES (?, ?, 'Normal', datetime('now', 'localtime'), datetime('now', 'localtime'))
      `);
      const insertResult = insertJobStmt.run(rowData.job_number, poId);
      jobId = insertResult.lastInsertRowid;
    }

    // ===== 步骤6: 查找或创建Part =====
    let partId = null;
    if (rowData.part_number?.trim()) {
      const findPartStmt = db.prepare(`
        SELECT id FROM part 
        WHERE drawing_number = ? AND revision = ? LIMIT 1
      `);
      let part = findPartStmt.get(rowData.part_number, rowData.revision || '');

      if (part) {
        partId = part.id;
      } else {
        const insertPartStmt = db.prepare(`
          INSERT INTO part (drawing_number, revision, unit_price, created_at, updated_at)
          VALUES (?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
        `);
        const insertResult = insertPartStmt.run(
          rowData.part_number,
          rowData.revision || '',
          parseFloat(rowData.price) || 0
        );
        partId = insertResult.lastInsertRowid;
      }
    }

    // ===== 步骤7: 创建Order Item =====
    // 先检查该(job_id, line_number)组合是否已存在
    const checkExistingStmt = db.prepare(`
      SELECT id FROM order_item 
      WHERE job_id = ? AND line_number = ?
      LIMIT 1
    `);
    const existingOrderItem = checkExistingStmt.get(jobId, rowData.line_number || 1);

    if (existingOrderItem) {
      // 该(job_id, line_number)已存在，返回现有的ID而不是插入新记录
      return existingOrderItem.id;
    }

    const insertOrderItemStmt = db.prepare(`
      INSERT INTO order_item (
        job_id, part_id, line_number, quantity, actual_price,
        drawing_release_date, delivery_required_date,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', datetime('now', 'localtime'), datetime('now', 'localtime'))
    `);

    const deliveryDate = rowData.delivery_required_date ?
      normalizeDate(rowData.delivery_required_date) : null;

    const insertResult = insertOrderItemStmt.run(
      jobId,
      partId,
      rowData.line_number || 1,
      parseInt(rowData.qty) || 0,
      parseFloat(rowData.price) || 0,
      rowData.dwg_release_date ? normalizeDate(rowData.dwg_release_date) : null,
      deliveryDate
    );

    return insertResult.lastInsertRowid;

  } catch (error) {
    throw new Error(`级联插入失败: ${error.message}`);
  }
}

/**
 * 将日期转换为数据库格式 (YYYY-MM-DD)
 * 支持：YYYY-MM-DD、Excel OA日期格式（数字）、字符串日期
 */
function normalizeDate(dateInput) {
  if (!dateInput && dateInput !== 0) return null;

  try {
    // 如果已经是YYYY-MM-DD格式，直接返回
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }

    let date;

    // 处理Excel OA日期格式（数字）
    if (typeof dateInput === 'number') {
      // Excel OA日期：1899-12-30是第1天，故需要从该日期开始偏移
      // 转换公式: new Date((value - 25569) * 86400000)
      // 25569是1970-01-01到1899-12-30的天数差
      date = new Date((dateInput - 25569) * 86400000);
    } else if (typeof dateInput === 'string') {
      // 尝试作为字符串解析
      date = new Date(dateInput);
    } else {
      return null;
    }

    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 更新已有order_item的ID到Excel AA列
 * （此函数由Excel侧的VBA处理，此处仅用于记录）
 */
function recordOrderItemIdForExcel(excelRow, orderItemId) {
  return {
    row: excelRow,
    column: 27, // AA列
    value: orderItemId,
  };
}

/**
 * 标记数据库中不在OE文件中的PO为过期
 */
function markInactivePurchaseOrders(db, activeOeNumbers) {
  const placeholders = activeOeNumbers.map(() => '?').join(',');
  const query = `
    UPDATE purchase_order
    SET is_active = 0, updated_at = datetime('now', 'localtime')
    WHERE is_active = 1 
      AND oe_number NOT IN (${placeholders})
  `;

  try {
    const stmt = db.prepare(query);
    const result = stmt.run(...activeOeNumbers);
    return result.changes;
  } catch (error) {
    throw new Error(`标记过期PO失败: ${error.message}`);
  }
}

/**
 * 恢复被标记为过期的PO（回滚操作）
 */
function restoreActivePurchaseOrders(db, oeNumbers) {
  const placeholders = oeNumbers.map(() => '?').join(',');
  const query = `
    UPDATE purchase_order
    SET is_active = 1, updated_at = datetime('now', 'localtime')
    WHERE oe_number IN (${placeholders})
  `;

  try {
    const stmt = db.prepare(query);
    const result = stmt.run(...oeNumbers);
    return result.changes;
  } catch (error) {
    throw new Error(`恢复PO失败: ${error.message}`);
  }
}

/**
 * 使用PowerShell脚本更新Excel AA列
 */
function updateExcelAaColumn(excelPath, updates) {
  if (!updates || updates.length === 0) {
    console.log('⊘ 没有需要更新的单元格');
    return 0;
  }

  // 转换为绝对路径
  const absolutePath = path.resolve(excelPath);

  // 构建PowerShell脚本，更新Excel AA列（第27列）
  const updatesJson = JSON.stringify(updates);
  const psScript = `
    $excelFile = "${absolutePath}"
    
    if (-not (Test-Path $excelFile)) {
      throw "Excel文件不存在: $excelFile"
    }
    
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    
    try {
      $workbook = $excel.Workbooks.Open($excelFile)
      $worksheet = $workbook.Sheets.Item("DELIVERY SCHEDULE")
      
      $updates = '${updatesJson}' | ConvertFrom-Json
      $updateCount = 0
      
      foreach ($update in $updates) {
        try {
          $row = $update.row
          $col = $update.column
          $value = $update.value
          
          if ($row -gt 0 -and $col -gt 0) {
            $worksheet.Cells($row, $col).Value2 = [int]$value
            $updateCount++
          }
        } catch {
          Write-Host "警告: 无法更新第 $row 行: $_"
        }
      }
      
      $workbook.Save()
      $workbook.Close($false)
      
      Write-Host $updateCount
      
      [System.Runtime.InteropServices.Marshal]::ReleaseComObject($workbook) | Out-Null
    } finally {
      $excel.Quit()
      [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
    }
  `;

  try {
    const psPath = path.join(__dirname, 'temp-update-excel.ps1');
    fs.writeFileSync(psPath, psScript);

    const result = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psPath}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024,
    });

    fs.unlinkSync(psPath);

    const updateCount = parseInt(result.trim());
    return isNaN(updateCount) ? 0 : updateCount;

  } catch (error) {
    throw new Error(`更新Excel失败: ${error.message}`);
  }
}

/**
 * 主流程：执行数据库同步
 */
function syncDatabase(excelFilePath) {
  const report = new SyncReport();
  let db;
  let markedInactiveOes = []; // 跟踪标记为过期的PO，用于回滚

  try {
    // 连接数据库
    db = new Database(CONFIG.db_path);
    db.pragma('foreign_keys = ON');
    db.pragma('transaction_isolation = IMMEDIATE');

    console.log('✓ 数据库连接成功');

    // 读取Excel数据
    const excelRows = readExcelData(excelFilePath);
    report.stats.total_rows = excelRows.length;

    if (excelRows.length === 0) {
      console.log('⚠️  未读取到任何数据');
      return report;
    }

    // 开始事务
    const transaction = db.transaction(() => {
      const allOeNumbers = [];
      const excelUpdates = [];

      // ===== 步骤1: 处理OE文件中的每一行 =====
      for (let i = 0; i < excelRows.length; i++) {
        const row = excelRows[i];
        allOeNumbers.push(row.oe_number);

        try {
          // 查找是否存在
          const existing = findOrderItem(db, row.oe_number, row.line_number, row.delivery_required_date);

          if (existing) {
            // 场景1: 已存在 → 记录更新
            excelUpdates.push(recordOrderItemIdForExcel(i + 2, existing.id)); // 行号从2开始（跳过header）
            report.addSuccess('matched', {
              oe_number: row.oe_number,
              line_number: row.line_number,
              order_item_id: existing.id,
            });
          } else {
            // 场景2: 不存在 → 级联插入
            const newOrderItemId = insertNewOrderItem(db, row);
            if (newOrderItemId) {
              excelUpdates.push(recordOrderItemIdForExcel(i + 2, newOrderItemId));
              report.addSuccess('inserted', {
                oe_number: row.oe_number,
                line_number: row.line_number,
                order_item_id: newOrderItemId,
              });
            } else {
              report.addWarning('插入失败，跳过此行', { oe_number: row.oe_number, line_number: row.line_number });
            }
          }
        } catch (error) {
          // 提取更详细的错误信息
          const errorMsg = error.stack || error.message || String(error);
          report.addError('process_row', new Error(`OE:${row.oe_number} Line:${row.line_number} - ${errorMsg}`), {
            oe_number: row.oe_number,
            line_number: row.line_number,
          });
        }
      }

      // ===== 步骤2: 标记不在OE中的PO为过期 =====
      try {
        const inactiveCount = markInactivePurchaseOrders(db, allOeNumbers);
        // 查询被标记的PO（用于回滚）
        const inactiveQuery = db.prepare(`
          SELECT oe_number FROM purchase_order 
          WHERE is_active = 0 
          ORDER BY updated_at DESC LIMIT ?
        `);
        const inactivePos = inactiveQuery.all(inactiveCount);
        markedInactiveOes = inactivePos.map(po => po.oe_number);

        report.addSuccess('marked_inactive', { count: inactiveCount });
      } catch (error) {
        report.addError('mark_inactive', error);
      }

      // ===== 步骤3: 返回Excel更新清单 =====
      return excelUpdates;
    });

    // 执行事务
    const excelUpdates = transaction();
    console.log(`✓ 事务完成，准备更新Excel: ${excelUpdates.length} 个单元格`);

    // ===== 步骤3: 使用PowerShell更新Excel AA列 =====
    try {
      const cellsUpdated = updateExcelAaColumn(excelFilePath, excelUpdates);
      report.stats.excel_cells_updated = cellsUpdated;
      console.log(`✅ Excel AA列已更新: ${cellsUpdated} 个单元格`);
    } catch (error) {
      report.addError('excel_update', error);
      // 发生错误时回滚数据库标记
      if (markedInactiveOes.length > 0) {
        try {
          restoreActivePurchaseOrders(db, markedInactiveOes);
          console.log('✓ 已恢复被标记为过期的PO');
        } catch (rollbackError) {
          console.error('❌ 回滚失败:', rollbackError.message);
        }
      }
      throw error;
    }

    report.print();
    report.save();

    return {
      success: true,
      report,
    };

  } catch (error) {
    console.error('❌ 同步失败:', error.message);

    // 回滚操作
    if (markedInactiveOes.length > 0) {
      try {
        restoreActivePurchaseOrders(db, markedInactiveOes);
        console.log('✓ 已恢复被标记为过期的PO');
      } catch (rollbackError) {
        console.error('❌ 回滚失败:', rollbackError.message);
      }
    }

    report.addError('main', error);
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
  const excelPath = process.argv[2] || path.join(process.cwd(), 'src', 'order entry log', 'Order Entry Log.xlsm');

  console.log('🚀 Order Entry Log 数据库同步脚本');
  console.log(`📁 Excel文件: ${excelPath}`);
  console.log(`📁 数据库: ${CONFIG.db_path}`);

  const result = syncDatabase(excelPath);

  if (!result.success) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('致命错误:', err);
  process.exit(1);
});
