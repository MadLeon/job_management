#!/usr/bin/env node

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
    const psPath = path.join(__dirname, 'temp-read-excel-diag.ps1');
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

const excelPath = path.join(process.cwd(), 'src', 'order entry log', 'Order Entry Log.xlsm');
const dbPath = path.join(process.cwd(), 'data', 'record.db');

console.log('='.repeat(80));
console.log('诊断Excel数据和插入失败的原因');
console.log('='.repeat(80));

// 读取Excel
console.log('\n读取Excel数据...');
const excelRows = readExcelData(excelPath);
console.log(`✓ 读取到 ${excelRows.length} 行`);

// 分析Excel中的数据
console.log('\n分析Excel数据特征...');
const emptyRows = excelRows.filter(r => !r.oe_number || !r.job_number).length;
const validRows = excelRows.filter(r => r.oe_number && r.job_number);
console.log(`  - 有效行(有OE号和Job号): ${validRows.length}`);
console.log(`  - 空行或缺少关键字段: ${emptyRows}`);

// 统计Excel中的(job, line)
const excelJobLineMap = new Map();
const excelDuplicates = [];
validRows.forEach((row, idx) => {
  const key = `${row.job_number}|${row.line_number || 'NULL'}`;
  if (excelJobLineMap.has(key)) {
    excelJobLineMap.get(key).push(idx);
  } else {
    excelJobLineMap.set(key, [idx]);
  }
});

// 找出重复的
excelJobLineMap.forEach((indices, key) => {
  if (indices.length > 1) {
    const [job, line] = key.split('|');
    excelDuplicates.push({ key, job, line, count: indices.length, rowIndices: indices });
  }
});

console.log(`\n✓ 分析Excel中的(job_number, line_number)组合:`);
console.log(`  - 唯一的组合数: ${excelJobLineMap.size}`);
console.log(`  - 重复的组合数: ${excelDuplicates.length}`);

if (excelDuplicates.length > 0) {
  console.log('\n  重复的组合:');
  excelDuplicates.slice(0, 10).forEach(dup => {
    console.log(`  - Job=${dup.job}, Line=${dup.line}, 重数=${dup.count}, 行号=${dup.rowIndices.map(i => i + 4).join(',')}`);
  });
  if (excelDuplicates.length > 10) {
    console.log(`  ... 还有 ${excelDuplicates.length - 10} 个重复`);
  }
}

// 检查数据库中的job
const db = new Database(dbPath);
const dbJobs = new Set(db.prepare('SELECT job_number FROM job').all().map(r => r.job_number));

const excelJobs = new Set(validRows.map(r => r.job_number));
const missingJobs = [...excelJobs].filter(j => !dbJobs.has(j));

console.log(`\n✓ 检查Excel中的job在数据库中是否存在:`);
console.log(`  - Excel中的唯一job: ${excelJobs.size}`);
console.log(`  - 数据库中的job: ${dbJobs.size}`);
console.log(`  - 不在数据库中的job: ${missingJobs.length}`);

if (missingJobs.length > 0) {
  console.log('\n  不存在的job (前10个):');
  missingJobs.slice(0, 10).forEach(job => {
    const count = validRows.filter(r => r.job_number === job).length;
    console.log(`  - ${job} (${count}行)`);
  });
}

// 对于存在的job，检查line_number冲突
const jobsExistingInDb = [...excelJobs].filter(j => dbJobs.has(j));
console.log(`\n✓ 检查已存在于数据库的job中的line_number冲突:`);
console.log(`  - 要检查的job数: ${jobsExistingInDb.length}`);

let potentialConflicts = [];
for (const jobNum of jobsExistingInDb) {
  const job = db.prepare('SELECT id FROM job WHERE job_number = ?').get(jobNum);
  if (!job) continue;

  const existingLines = new Set(
    db.prepare('SELECT line_number FROM order_item WHERE job_id = ?')
      .all(job.id)
      .map(r => r.line_number)
  );

  const excelRowsForJob = validRows.filter(r => r.job_number === jobNum);
  excelRowsForJob.forEach((row, idx) => {
    if (existingLines.has(row.line_number)) {
      potentialConflicts.push({
        job: jobNum,
        line: row.line_number,
        excelRowIndex: idx
      });
    }
  });
}

if (potentialConflicts.length === 0) {
  console.log('  ✓ 没有line_number冲突');
} else {
  console.log(`  ✗ 发现 ${potentialConflicts.length} 个line_number冲突`);
  console.log('\n  冲突详情 (前10个):');
  potentialConflicts.slice(0, 10).forEach(conflict => {
    console.log(`  - Job=${conflict.job}, Line=${conflict.line}`);
  });
}

// 总结
console.log('\n' + '='.repeat(80));
console.log('诊断总结:');
console.log('='.repeat(80));
console.log(`Excel有效行: ${validRows.length}`);
console.log(`Excel中的重复(job,line): ${excelDuplicates.length}`);
console.log(`数据库中缺失的job: ${missingJobs.length}`);
console.log(`数据库中有冲突的line_number: ${potentialConflicts.length}`);
console.log(`\n预期可以成功插入的行数:`);
const failedDueToMissingJob = missingJobs.reduce((sum, job) => {
  return sum + validRows.filter(r => r.job_number === job).length;
}, 0);
const expectedSuccess = validRows.length - excelDuplicates.length - potentialConflicts.length - failedDueToMissingJob;
console.log(`  = ${validRows.length} (有效行) 
            - ${excelDuplicates.length} (Excel中的重复)
            - ${potentialConflicts.length} (数据库中的冲突)
            - ${failedDueToMissingJob} (缺失的job)
            = ${expectedSuccess} 行`);

db.close();
