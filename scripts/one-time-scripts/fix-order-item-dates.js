#!/usr/bin/env node

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = process.cwd();
const dbPath = path.join(projectRoot, 'data', 'record.db');
const csvPath = path.join(projectRoot, 'src', 'order entry log', 'Order Entry Log - new.csv');

/**
 * 将日期格式转换为ISO格式（YYYY-MM-DD）
 * 支持格式: M/D/YYYY, M-D-YYYY, D-MMM-YY等
 * @param {string} dateStr 原始日期字符串
 * @returns {string|null} ISO格式的日期字符串或null
 */
function convertToISODate(dateStr) {
  if (!dateStr || dateStr.trim() === '') {
    return null;
  }

  const trimmed = dateStr.trim();

  // 格式1: M/D/YYYY 或 MM/DD/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const month = String(slashMatch[1]).padStart(2, '0');
    const day = String(slashMatch[2]).padStart(2, '0');
    const year = slashMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 格式2: D-MMM-YY (如 7-Mar-24)
  const shortDateMatch = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
  if (shortDateMatch) {
    const day = String(shortDateMatch[1]).padStart(2, '0');
    const monthStr = shortDateMatch[2];
    const year = shortDateMatch[3];
    
    const months = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
      'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    
    const monthNum = months[monthStr];
    if (monthNum) {
      const fullYear = parseInt(year) < 50 ? '20' + year : '19' + year;
      return `${fullYear}-${monthNum}-${day}`;
    }
  }

  // 格式3: YYYY-MM-DD（已经是ISO格式）
  if (trimmed.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return trimmed;
  }

  // 无法识别的格式，返回null
  return null;
}

/**
 * 从CSV文件读取drawing_release_date和delivery_required_date数据
 * 按Order Item ID（第1列）建立查找表
 * 使用第9列作为drawing_release_date，第17列作为delivery_required_date
 * @returns {Map<string, {drawing_release_date: string, delivery_required_date: string}>}
 */
function readOEDataFromCSV() {
  const oeDataMap = new Map();
  
  if (!fs.existsSync(csvPath)) {
    console.error(`✗ CSV文件不存在: ${csvPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n');

  // 跳过标题行（第一行）
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 跳过空行
    if (!line) continue;

    const cols = line.split(',');
    
    // 需要至少17列
    if (cols.length < 17) continue;

    const orderItemId = cols[0].trim().replace(/"/g, '');
    const dwgRelRaw = cols[8].trim().replace(/"/g, '');
    const delReqdRaw = cols[16].trim().replace(/"/g, '');

    // 跳过Order Item ID为空的行
    if (!orderItemId) continue;

    // 转换日期格式为ISO格式
    const dwgRel = convertToISODate(dwgRelRaw);
    const delReqd = convertToISODate(delReqdRaw);

    oeDataMap.set(orderItemId, {
      drawing_release_date: dwgRel,
      delivery_required_date: delReqd
    });
  }

  return oeDataMap;
}

/**
 * 主函数
 */
function main() {
  try {
    console.log('📖 读取OE文件中的数据...');
    const oeDataMap = readOEDataFromCSV();
    console.log(`✓ 从OE文件中提取 ${oeDataMap.size} 条记录\n`);

    const db = new Database(dbPath);
    
    console.log('📋 扫描order_item表ID范围1082-1148的记录...');
    const records = db.prepare(
      'SELECT id FROM order_item WHERE id BETWEEN 1082 AND 1148'
    ).all();
    
    console.log(`  扫描到 ${records.length} 条记录\n`);
    
    console.log('🔄 更新order_item字段...');
    
    let successCount = 0;
    let skipCount = 0;
    const updated = [];
    const skipped = [];

    const updateStmt = db.prepare(
      'UPDATE order_item SET drawing_release_date = ?, delivery_required_date = ? WHERE id = ?'
    );

    const transaction = db.transaction(() => {
      for (const record of records) {
        // 将order_item的id作为order_item_id来查找
        const oeData = oeDataMap.get(String(record.id));
        
        if (oeData) {
          updateStmt.run(oeData.drawing_release_date, oeData.delivery_required_date, record.id);
          successCount++;
          updated.push({
            id: record.id,
            drawing_release_date: oeData.drawing_release_date,
            delivery_required_date: oeData.delivery_required_date
          });
        } else {
          skipCount++;
          skipped.push(record.id);
        }
      }
    });

    transaction();
    
    console.log(`✓ 成功更新 ${successCount} 条记录`);
    console.log(`⊘ 跳过 ${skipCount} 条记录（未在OE文件中找到）\n`);

    if (successCount > 0) {
      console.log('📊 更新的记录（前10条）:\n');
      console.log('ID\tDWG Rel.\tDel. Req\'d');
      console.log('─'.repeat(60));
      updated.slice(0, 10).forEach(r => {
        console.log(`${r.id}\t${r.drawing_release_date || 'NULL'}\t${r.delivery_required_date || 'NULL'}`);
      });
    }

    if (skipCount > 0) {
      console.log(`\n⊘ 未在OE文件中找到的记录 (${skipCount} 条):`);
      console.log(skipped.join(', '));
    }

    console.log('\n✅ 任务完成！');
    db.close();
    
  } catch (error) {
    console.error('✗ 错误:', error.message);
    process.exit(1);
  }
}

main();
