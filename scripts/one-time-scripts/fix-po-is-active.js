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
 * 从CSV文件读取所有有效的oe_number
 * @returns {Set<string>} OE Number集合
 */
function readOENumbersFromCSV() {
  const oeNumbers = new Set();
  
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

    // 第2列（索引1）是O.E.列
    const cols = line.split(',');
    if (cols.length > 1) {
      const oe = cols[1].trim().replace(/"/g, '');
      
      // 跳过空的OE值
      if (oe && oe !== '') {
        oeNumbers.add(oe);
      }
    }
  }

  return oeNumbers;
}

/**
 * 主函数
 */
function main() {
  try {
    console.log('📖 读取OE文件中的oe_number...');
    const oeNumbers = readOENumbersFromCSV();
    console.log(`✓ 找到 ${oeNumbers.size} 个有效的OE Number\n`);

    const db = new Database(dbPath);
    
    console.log('📋 遍历po表检查is_active状态...');
    const poRecords = db.prepare('SELECT id, po_number, oe_number, is_active FROM purchase_order').all();
    
    const needsUpdate = [];
    const alreadyInactive = [];
    const stillActive = [];

    for (const po of poRecords) {
      const oeExists = oeNumbers.has(po.oe_number);
      
      if (oeExists) {
        // OE存在，保持原状
        if (po.is_active === 0) {
          alreadyInactive.push(po);
        } else {
          stillActive.push(po);
        }
      } else {
        // OE不存在，需要更新
        if (po.is_active === 1) {
          needsUpdate.push(po);
        } else {
          alreadyInactive.push(po);
        }
      }
    }

    console.log(`  已扫描 ${poRecords.length} 条PO记录`);
    console.log(`  • 保持活跃: ${stillActive.length}`);
    console.log(`  • 需要设为无效: ${needsUpdate.length}`);
    console.log(`  • 已是无效: ${alreadyInactive.length}\n`);

    if (needsUpdate.length > 0) {
      console.log('🔄 更新PO记录is_active字段...');
      
      const updateStmt = db.prepare('UPDATE purchase_order SET is_active = 0 WHERE id = ?');
      const transaction = db.transaction(() => {
        for (const po of needsUpdate) {
          updateStmt.run(po.id);
        }
      });
      
      transaction();
      
      console.log(`✓ 成功更新 ${needsUpdate.length} 条记录\n`);

      console.log('📊 被更新的PO记录:\n');
      console.log('ID\tPO Number\tOE Number\tStatus');
      console.log('─'.repeat(50));
      needsUpdate.forEach(po => {
        console.log(`${po.id}\t${po.po_number}\t\t${po.oe_number}\t\t已设为无效`);
      });
    } else {
      console.log('✓ 无需更新，所有PO记录的is_active字段已正确\n');
    }

    console.log('\n✅ 任务完成！');
    db.close();
    
  } catch (error) {
    console.error('✗ 错误:', error.message);
    process.exit(1);
  }
}

main();
