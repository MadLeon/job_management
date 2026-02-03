/**
 * 迁移: 015_fix_revision_and_description.js
 * 功能:
 * 1. 修复 revision 小数格式 (例如 "1.0" -> "1")
 * 2. 从 OE 文件读取 description 并填充到 part 表
 * 
 * 流程:
 * - 找到所有 id >= 1895 且 description 为空的 part 记录
 * - 对于每个 part，找到关联的 order_item
 * - 使用 order_item.id 在 OE 文件的 AA 列查找相同行
 * - 读取该行的 "Descriptions:" 值，更新 part.description
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = process.cwd();

const dbPath = path.join(projectRoot, 'data', 'record.db');
const oeFilePath = path.join(projectRoot, 'src', 'order entry log', 'Order Entry Log.xlsm');

/**
 * up: 执行迁移
 */
export function up(db) {
  console.log('执行迁移 015: 修复 revision 和 description...\n');

  let revisionsFixed = 0;
  let descriptionsFixed = 0;

  try {
    // ========== 第一部分: 删除小数形式 revision 的重复记录 ==========
    console.log('步骤 1: 删除小数形式 revision 的重复记录 (例如 1.0，保留正确格式 1)');
    
    const revisionsToDelete = db.prepare(`
      SELECT p1.id, p1.drawing_number, p1.revision
      FROM part p1
      WHERE p1.id >= 1895 AND p1.revision LIKE '%.%'
        AND CAST(p1.revision AS REAL) IS NOT NULL
        AND p1.id != 3417
        AND EXISTS (
          SELECT 1 FROM part p2
          WHERE p2.drawing_number = p1.drawing_number
            AND p2.id != p1.id
            AND CAST(p2.revision AS REAL) = CAST(p1.revision AS REAL)
        )
    `).all();

    console.log(`  找到 ${revisionsToDelete.length} 条重复记录需要删除\n`);

    for (const row of revisionsToDelete) {
      // 删除重复的记录（保留 ID 较小的正确版本）
      db.prepare(`DELETE FROM part WHERE id = ?`).run(row.id);
      
      console.log(`  ID ${row.id}: 已删除 (${row.drawing_number} / ${row.revision})`);
      revisionsFixed++;
    }

    console.log(`\n✅ 共修复 ${revisionsFixed} 条 revision 记录\n`);

    // ========== 第二部分: 从 OE 文件读取 description 并填充 ==========
    console.log('步骤 2: 从 OE 文件读取 description...');

    if (!fs.existsSync(oeFilePath)) {
      console.log(`⚠️  警告: OE 文件不存在: ${oeFilePath}`);
      console.log('跳过 description 填充步骤\n');
      return;
    }

    // 读取 OE 文件的 DELIVERY SCHEDULE 工作表
    const oeData = readOrderEntryFile(oeFilePath);
    console.log(`  从 OE 文件读取了 ${oeData.length} 条记录\n`);

    // 建立 order_item_id -> description 的映射
    const descriptionMap = {};
    for (const row of oeData) {
      if (row.order_item_id) {
        descriptionMap[row.order_item_id] = row.description;
      }
    }

    console.log(`  建立了 ${Object.keys(descriptionMap).length} 条映射关系\n`);

    // 找到所有 id >= 1895 且 description 为空的 part 记录
    console.log('步骤 3: 查找需要填充 description 的 part...');
    
    const partsToFix = db.prepare(`
      SELECT DISTINCT p.id, p.drawing_number
      FROM part p
      WHERE p.id >= 1895 
        AND (p.description IS NULL OR p.description = '')
      ORDER BY p.id
    `).all();

    console.log(`  找到 ${partsToFix.length} 条 part 记录需要填充 description\n`);

    for (const part of partsToFix) {
      // 找到引用这个 part 的第一个 order_item
      const orderItem = db.prepare(`
        SELECT id FROM order_item
        WHERE part_id = ?
        LIMIT 1
      `).get(part.id);

      if (!orderItem) {
        console.log(`  ID ${part.id}: 未找到关联的 order_item (可能没有任何订单引用)`);
        continue;
      }

      // 在映射中查找 description
      const description = descriptionMap[orderItem.id];

      if (!description) {
        console.log(`  ID ${part.id}: order_item ${orderItem.id} 在 OE 文件中未找到对应行`);
        continue;
      }

      // 更新 part.description
      db.prepare(`
        UPDATE part 
        SET description = ?, updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(description, part.id);

      console.log(`  ID ${part.id}: description 已更新 (order_item: ${orderItem.id}, desc: "${description}")`);
      descriptionsFixed++;
    }

    console.log(`\n✅ 共填充 ${descriptionsFixed} 条 description 记录\n`);
    console.log(`========== 迁移完成 ==========`);
    console.log(`修复 revision: ${revisionsFixed} 条`);
    console.log(`填充 description: ${descriptionsFixed} 条`);
    console.log(`总计: ${revisionsFixed + descriptionsFixed} 条记录已修复\n`);

  } catch (error) {
    console.error('迁移失败:', error.message);
    throw error;
  }
}

/**
 * down: 回滚迁移
 * 注: 此迁移不支持完全回滚，因为无法恢复原始数据
 */
export function down(db) {
  console.log('⚠️  警告: 此迁移不支持回滚，因为无法恢复原始数据');
  console.log('如需恢复，请从备份恢复数据库');
}

/**
 * 读取 OE 文件的 DELIVERY SCHEDULE 工作表
 * 返回 array of { order_item_id, description, ... }
 */
function readOrderEntryFile(filePath) {
  const psScript = `
    $excelFile = "${filePath}"
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    
    try {
      $workbook = $excel.Workbooks.Open($excelFile)
      $worksheet = $workbook.Sheets.Item("DELIVERY SCHEDULE")
      
      $usedRange = $worksheet.UsedRange
      $lastRow = $usedRange.Rows.Count
      $lastCol = 27
      
      $headers = @()
      for ($col = 1; $col -le $lastCol; $col++) {
        $headerValue = $worksheet.Cells(3, $col).Value2
        $headers += [string]($null -eq $headerValue ? "" : $headerValue)
      }
      
      $data = @()
      for ($row = 4; $row -le $lastRow; $row++) {
        $rowData = @{}
        for ($col = 1; $col -le $lastCol; $col++) {
          $headerName = $headers[$col - 1]
          $cellValue = $worksheet.Cells($row, $col).Value2
          $rowData[$headerName] = [string]($null -eq $cellValue ? "" : $cellValue)
        }
        $data += $rowData
      }
      
      $data | ConvertTo-Json | Write-Host
    } finally {
      $workbook.Close($false)
      $excel.Quit()
      [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
    }
  `;

  try {
    const psPath = path.join(__dirname, 'temp-read-oe-015.ps1');
    fs.writeFileSync(psPath, psScript);

    const result = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psPath}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      maxBuffer: 50 * 1024 * 1024,
    });

    fs.unlinkSync(psPath);

    const output = result.trim();
    if (!output || output === '[]') {
      return [];
    }

    const rows = JSON.parse(output);
    const rowsArray = Array.isArray(rows) ? rows : [rows];

    // 规范化列名: 找到 AA 列的值作为 order_item_id，找到 Descriptions 列
    return rowsArray.map(row => {
      let orderItemId = null;
      let description = '';

      for (const [key, value] of Object.entries(row)) {
        if (key.includes('Descriptions') || key.includes('Description')) {
          description = String(value || '').trim();
        }
        // 查找数值作为 order_item_id
        if (/^\d+$/.test(String(value).trim())) {
          const numValue = parseInt(value);
          if (numValue > 0 && numValue < 100000 && !orderItemId) {
            orderItemId = numValue;
          }
        }
      }

      return {
        order_item_id: orderItemId,
        description: description,
      };
    }).filter(row => row.order_item_id);

  } catch (error) {
    console.error('读取 OE 文件失败:', error.message);
    return [];
  }
}
