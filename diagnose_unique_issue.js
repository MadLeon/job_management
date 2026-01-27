#!/usr/bin/env node

/**
 * 诊断脚本：分析UNIQUE约束冲突的真实原因
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取Excel数据
function readExcelData(excelFilePath) {
  const psScript = `
    param([string]$excelFile)
    
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    
    try {
      $workbook = $excel.Workbooks.Open("$excelFile")
      $worksheet = $workbook.Sheets.Item("DELIVERY SCHEDULE")
      
      $lastRow = $worksheet.UsedRange.Rows.Count
      
      $result = @()
      for ($row = 4; $row -le $lastRow; $row++) {
        $rowData = @{
          row_num = $row
          oe_number = $worksheet.Cells($row, 1).Value2
          line_number = $worksheet.Cells($row, 2).Value2
          job_number = $worksheet.Cells($row, 3).Value2
          customer = $worksheet.Cells($row, 4).Value2
          qty = $worksheet.Cells($row, 5).Value2
          part_number = $worksheet.Cells($row, 6).Value2
          revision = $worksheet.Cells($row, 7).Value2
        }
        $result += $rowData
      }
      
      $result | ConvertTo-Json | Write-Host
      
      [System.Runtime.InteropServices.Marshal]::ReleaseComObject($workbook) | Out-Null
    } finally {
      $excel.Quit()
      [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
    }
  `;

  try {
    const psPath = path.join(__dirname, 'temp-read-excel.ps1');
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
    return Array.isArray(rows) ? rows : [rows];
  } catch (error) {
    throw new Error(`读取Excel失败: ${error.message}`);
  }
}

// 主诊断流程
function diagnose() {
  const dbPath = path.join(process.cwd(), 'data', 'record.db');
  const excelPath = path.join(process.cwd(), 'src', 'order entry log', 'Order Entry Log.xlsm');

  console.log('='.repeat(80));
  console.log('📋 诊断UNIQUE约束冲突');
  console.log('='.repeat(80));

  // 1. 读取Excel数据
  console.log('\n📖 读取Excel数据...');
  const excelRows = readExcelData(excelPath);
  console.log(`✓ 读取到 ${excelRows.length} 行数据`);

  // 2. 分析Excel中的重复(job, line_number)
  console.log('\n🔍 分析Excel中的重复(job_number, line_number)...');
  const excelJobLineMap = new Map();
  const excelDuplicates = [];

  excelRows.forEach((row, idx) => {
    if (!row.job_number || row.line_number === undefined) {
      return; // 跳过空行
    }

    const key = `${row.job_number}|${row.line_number}`;
    if (excelJobLineMap.has(key)) {
      excelDuplicates.push({
        key,
        job_number: row.job_number,
        line_number: row.line_number,
        rows: [...excelJobLineMap.get(key), idx + 1]
      });
      excelJobLineMap.set(key, [...excelJobLineMap.get(key), idx + 1]);
    } else {
      excelJobLineMap.set(key, [idx + 1]);
    }
  });

  if (excelDuplicates.length === 0) {
    console.log('✓ Excel中没有重复的(job_number, line_number)');
  } else {
    console.log(`⚠️  Excel中有 ${excelDuplicates.length} 个重复的(job_number, line_number):`);
    excelDuplicates.slice(0, 10).forEach(dup => {
      console.log(`  - Job: ${dup.job_number}, Line: ${dup.line_number}, 出现在行: ${dup.rows.join(', ')}`);
    });
    if (excelDuplicates.length > 10) {
      console.log(`  ... 还有 ${excelDuplicates.length - 10} 个重复`);
    }
  }

  // 3. 从数据库中查询现有的order_item记录
  console.log('\n📊 查询数据库中现有的order_item记录...');
  const db = new Database(dbPath);

  const existingItems = db.prepare(`
    SELECT oi.id, oi.job_id, oi.line_number, j.job_number
    FROM order_item oi
    JOIN job j ON oi.job_id = j.id
    ORDER BY j.job_number, oi.line_number
  `).all();

  console.log(`✓ 数据库中有 ${existingItems.length} 条order_item记录`);

  // 4. 分析Excel中的job是否都在数据库中存在
  console.log('\n🔎 分析Excel中的job是否在数据库中...');
  const excelJobs = new Set(excelRows.map(r => r.job_number).filter(j => j));
  const dbJobs = db.prepare(`SELECT DISTINCT job_number FROM job`).all().map(r => r.job_number);
  const dbJobSet = new Set(dbJobs);

  const missingJobs = [...excelJobs].filter(j => !dbJobSet.has(j));
  console.log(`Excel中有 ${excelJobs.size} 个不同的job号`);
  console.log(`数据库中有 ${dbJobs.length} 个job号`);

  if (missingJobs.length > 0) {
    console.log(`⚠️  Excel中有 ${missingJobs.length} 个job在数据库中不存在:`);
    missingJobs.slice(0, 20).forEach(job => {
      const count = excelRows.filter(r => r.job_number === job).length;
      console.log(`  - ${job} (${count}行)`);
    });
    if (missingJobs.length > 20) {
      console.log(`  ... 还有 ${missingJobs.length - 20} 个missing job`);
    }
  } else {
    console.log('✓ Excel中的所有job都在数据库中存在');
  }

  // 5. 对于存在的job，检查是否会有line_number冲突
  console.log('\n⚔️  检查现有job中的line_number冲突...');

  const jobsInBoth = [...excelJobs].filter(j => dbJobSet.has(j));
  let potentialConflicts = 0;
  const conflictDetails = [];

  for (const jobNum of jobsInBoth) {
    const job = db.prepare(`SELECT id, job_number FROM job WHERE job_number = ?`).get(jobNum);
    if (!job) continue;

    const existingLines = db.prepare(`
      SELECT line_number FROM order_item WHERE job_id = ?
    `).all(job.id).map(r => r.line_number);

    const excelLines = excelRows
      .filter(r => r.job_number === jobNum)
      .map(r => r.line_number);

    const conflictingLines = excelLines.filter(line => existingLines.includes(line));
    if (conflictingLines.length > 0) {
      potentialConflicts += conflictingLines.length;
      if (conflictDetails.length < 20) {
        conflictDetails.push({
          job: jobNum,
          lines: conflictingLines
        });
      }
    }
  }

  if (potentialConflicts === 0) {
    console.log('✓ 现有job中没有line_number冲突');
  } else {
    console.log(`⚠️  发现 ${potentialConflicts} 个潜在的line_number冲突:`);
    conflictDetails.forEach(detail => {
      console.log(`  - Job: ${detail.job}, Lines: ${detail.lines.join(', ')}`);
    });
  }

  // 6. 统计数据
  console.log('\n📈 统计摘要:');
  console.log(`  - Excel总行数: ${excelRows.length}`);
  console.log(`  - Excel中的唯一job数: ${excelJobs.size}`);
  console.log(`  - 数据库中的job数: ${dbJobs.length}`);
  console.log(`  - 数据库中的order_item数: ${existingItems.length}`);
  console.log(`  - Excel中重复的(job, line): ${excelDuplicates.length}`);
  console.log(`  - 数据库中会产生冲突的插入: ${potentialConflicts}`);
  console.log(`  - 预期可以成功插入: ${excelRows.length - missingJobs.reduce((sum, job) => {
    return sum + excelRows.filter(r => r.job_number === job).length;
  }, 0) - excelDuplicates.length - potentialConflicts}`);

  // 7. 采样一些失败的行，看看真正的错误
  console.log('\n🧪 采样检查一些失败行的详细信息...');
  const sampleRows = excelRows.slice(20, 30);
  sampleRows.forEach((row, idx) => {
    console.log(`\n  行${row.row_num}: OE=${row.oe_number}, Job=${row.job_number}, Line=${row.line_number}, Part=${row.part_number}`);

    if (!row.job_number) {
      console.log(`    ❌ 原因: job_number为空`);
      return;
    }

    const job = db.prepare(`SELECT id FROM job WHERE job_number = ?`).get(row.job_number);
    if (!job) {
      console.log(`    ❌ 原因: 数据库中没有此job_number`);
      return;
    }

    const existing = db.prepare(`
      SELECT id FROM order_item WHERE job_id = ? AND line_number = ?
    `).get(job.id, row.line_number);

    if (existing) {
      console.log(`    ❌ 原因: 此(job_id, line_number)已存在`);
      return;
    }

    const part = row.part_number ? db.prepare(`
      SELECT id FROM part WHERE drawing_number = ?
    `).get(row.part_number) : null;

    console.log(`    ✓ 应该可以插入 (job存在=${!!job}, part存在=${!!part})`);
  });

  db.close();

  console.log('\n' + '='.repeat(80));
}

diagnose();
