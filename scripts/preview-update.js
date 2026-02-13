/**
 * Preview update changes for order_item from update.csv
 * Shows what would be updated without actually modifying the database
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.join(__dirname, '../src/order entry log/update.csv');
const DB_PATH = path.join(__dirname, '../data/record.db');

/**
 * Parse date string to yyyy-mm-dd format
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') {
    return null;
  }

  dateStr = dateStr.trim();

  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      let year = parseInt(parts[0]);
      let month = parseInt(parts[1]);
      let day = parseInt(parts[2]);

      if (year < 100) {
        year = year < 50 ? 2000 + year : 1900 + year;
      }

      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  }

  if (dateStr.includes('-')) {
    const months = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
    };

    const parts = dateStr.toLowerCase().split('-');
    if (parts.length === 3) {
      const monthStr = parts[0].substring(0, 3);
      const month = months[monthStr];
      const day = parseInt(parts[1]);
      let year = parseInt(parts[2]);

      if (month && !isNaN(day) && !isNaN(year)) {
        if (year < 100) {
          year = year < 50 ? 2000 + year : 1900 + year;
        }

        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }
  }

  return null;
}

/**
 * Parse CSV file
 */
function parseCSV() {
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.split('\n');
  const records = [];
  const seenIds = new Set();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      continue;
    }

    const parts = line.split(',').map(p => p.trim());
    const quantity = parts[0] || null;
    const deliveryDate = parts[1] || null;
    const orderItemId = parts[2] ? parseInt(parts[2]) : null;

    if (!orderItemId || isNaN(orderItemId)) {
      continue;
    }

    if (seenIds.has(orderItemId)) {
      continue;
    }
    seenIds.add(orderItemId);

    const parsedDate = deliveryDate ? parseDate(deliveryDate) : null;

    records.push({
      orderItemId,
      quantity: quantity || null,
      deliveryDate: parsedDate
    });
  }

  return records;
}

/**
 * Get current data from database
 */
function getCurrentData(db, orderItemId) {
  const stmt = db.prepare(`
    SELECT id, quantity, delivery_required_date, job_id, part_id
    FROM order_item
    WHERE id = ?
  `);
  return stmt.get(orderItemId);
}

/**
 * Main preview function
 */
async function main() {
  console.log('=' .repeat(90));
  console.log('📋 UPDATE PREVIEW - ORDER ITEMS');
  console.log('=' .repeat(90));

  // Parse CSV
  const records = parseCSV();
  console.log(`\n✅ 从 CSV 中解析出 ${records.length} 条有效记录\n`);

  // Open database and check data
  const db = new Database(DB_PATH, { readonly: true });

  const updates = [];
  let validCount = 0;
  let notFoundCount = 0;
  let noChangeCount = 0;

  console.log('🔍 检查数据库中的数据...\n');

  for (const record of records) {
    const { orderItemId, quantity, deliveryDate } = record;
    const current = getCurrentData(db, orderItemId);

    if (!current) {
      notFoundCount++;
      console.log(`❌ Order Item ID ${orderItemId} - 数据库中不存在`);
      continue;
    }

    validCount++;

    // Check if there's any change
    const qtyChanged = current.quantity !== quantity && (current.quantity || null) !== quantity;
    const dateChanged = current.delivery_required_date !== deliveryDate;

    if (!qtyChanged && !dateChanged) {
      noChangeCount++;
      console.log(`⏭️  Order Item ID ${orderItemId} - 无变化（已有相同数据）`);
      continue;
    }

    updates.push({
      orderItemId,
      job_id: current.job_id,
      part_id: current.part_id,
      quantityOld: current.quantity,
      quantityNew: quantity,
      dateOld: current.delivery_required_date,
      dateNew: deliveryDate,
      qtyChanged,
      dateChanged
    });
  }

  db.close();

  // Summary
  console.log('\n' + '='.repeat(90));
  console.log('📊 预览总结');
  console.log('='.repeat(90));
  console.log(`总处理条数: ${records.length}`);
  console.log(`  ✅ 有效（数据库中存在）: ${validCount}`);
  console.log(`  ❌ 无效（数据库中不存在）: ${notFoundCount}`);
  console.log(`  ⏭️  无变化: ${noChangeCount}`);
  console.log(`  📝 需要更新: ${updates.length}`);
  console.log('='.repeat(90));

  if (updates.length === 0) {
    console.log('\n✅ 无需要更新的数据');
    return;
  }

  // Detailed list of updates
  console.log('\n📝 详细更新清单：\n');

  // Group by type of change
  const qtyOnlyUpdates = updates.filter(u => u.qtyChanged && !u.dateChanged);
  const dateOnlyUpdates = updates.filter(u => !u.qtyChanged && u.dateChanged);
  const bothUpdates = updates.filter(u => u.qtyChanged && u.dateChanged);

  if (qtyOnlyUpdates.length > 0) {
    console.log(`🔢 仅更新数量 (${qtyOnlyUpdates.length} 条):`);
    qtyOnlyUpdates.forEach(u => {
      console.log(`   Order Item ${u.orderItemId}: ${u.quantityOld || '∅'} → ${u.quantityNew || '∅'}`);
    });
    console.log();
  }

  if (dateOnlyUpdates.length > 0) {
    console.log(`📅 仅更新日期 (${dateOnlyUpdates.length} 条):`);
    dateOnlyUpdates.forEach(u => {
      console.log(`   Order Item ${u.orderItemId}: ${u.dateOld || '∅'} → ${u.dateNew || '∅'}`);
    });
    console.log();
  }

  if (bothUpdates.length > 0) {
    console.log(`🔄 同时更新数量和日期 (${bothUpdates.length} 条):`);
    bothUpdates.forEach(u => {
      console.log(`   Order Item ${u.orderItemId}:`);
      console.log(`      数量: ${u.quantityOld || '∅'} → ${u.quantityNew || '∅'}`);
      console.log(`      日期: ${u.dateOld || '∅'} → ${u.dateNew || '∅'}`);
    });
    console.log();
  }

  // Top statistics
  console.log('\n' + '='.repeat(90));
  console.log('📈 统计信息');
  console.log('='.repeat(90));
  console.log(`仅数量变化: ${qtyOnlyUpdates.length}`);
  console.log(`仅日期变化: ${dateOnlyUpdates.length}`);
  console.log(`两者都变化: ${bothUpdates.length}`);
  console.log(`总计需更新: ${updates.length}`);
  console.log('='.repeat(90));

  // Export to JSON for reference
  const reportPath = path.join(__dirname, '../data/update-preview.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      totalRecords: records.length,
      valid: validCount,
      notFound: notFoundCount,
      noChange: noChangeCount,
      needsUpdate: updates.length
    },
    updates: {
      qtyOnly: qtyOnlyUpdates.length,
      dateOnly: dateOnlyUpdates.length,
      both: bothUpdates.length
    },
    details: updates
  }, null, 2));

  console.log(`\n💾 详细报告已保存到: ${reportPath}`);
  console.log('\n✅ 预览完成。确认后可运行更新脚本。\n');
}

main().catch(error => {
  console.error('❌ 错误:', error);
  process.exit(1);
});
