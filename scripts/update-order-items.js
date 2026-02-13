/**
 * Update order_item table with data from update.csv
 * Process: Parse CSV, handle duplicates (keep first), normalize dates, and update DB
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
 * Handles: "2024/3/7", "Jan-5-26", "2026/1/5", etc.
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') {
    return null;
  }

  dateStr = dateStr.trim();

  // Handle format: YYYY/M/D or YYYY/MM/DD
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      let year = parseInt(parts[0]);
      let month = parseInt(parts[1]);
      let day = parseInt(parts[2]);

      // Handle 2-digit year (e.g., "02" -> 2002)
      if (year < 100) {
        year = year < 50 ? 2000 + year : 1900 + year;
      }

      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  }

  // Handle format: "Jan-5-26", "Jan-05-26", etc.
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
        // Handle 2-digit year
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

  // If parsing fails, return null
  console.warn(`Warning: Could not parse date "${dateStr}"`);
  return null;
}

/**
 * Read and parse CSV file
 * Returns array of {orderItemId, quantity, deliveryDate}
 */
function parseCSV() {
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.split('\n');
  const records = [];
  const seenIds = new Set(); // Track seen Order Item IDs

  // Skip header line (line 0: "Qty.:,Del. Req'd:,Order Item ID")
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) {
      continue;
    }

    // Parse CSV line
    const parts = line.split(',').map(p => p.trim());
    const quantity = parts[0] || null;
    const deliveryDate = parts[1] || null;
    const orderItemId = parts[2] ? parseInt(parts[2]) : null;

    // Skip if no Order Item ID
    if (!orderItemId || isNaN(orderItemId)) {
      continue;
    }

    // Skip duplicate Order Item IDs (keep only first occurrence)
    if (seenIds.has(orderItemId)) {
      console.log(`  Skipping duplicate Order Item ID: ${orderItemId}`);
      continue;
    }
    seenIds.add(orderItemId);

    // Parse date
    const parsedDate = deliveryDate ? parseDate(deliveryDate) : null;

    records.push({
      orderItemId,
      quantity: quantity || null, // Keep as text, even if it's "Lot", "1+1", etc.
      deliveryDate: parsedDate
    });
  }

  return records;
}

/**
 * Validate that Order Item ID exists in database
 */
function validateOrderItemId(db, orderItemId) {
  const stmt = db.prepare('SELECT id FROM order_item WHERE id = ?');
  return stmt.get(orderItemId) !== undefined;
}

/**
 * Get current data before update
 */
function getCurrentOrderItem(db, orderItemId) {
  const stmt = db.prepare(`
    SELECT id, quantity, delivery_required_date
    FROM order_item
    WHERE id = ?
  `);
  return stmt.get(orderItemId);
}

/**
 * Update database with records
 */
function updateDatabase(records) {
  const db = new Database(DB_PATH);

  let updateCount = 0;
  let skipCount = 0;
  const updates = [];
  const detailedChanges = [];

  console.log('\n📊 Processing records...\n');

  for (const record of records) {
    const { orderItemId, quantity, deliveryDate } = record;

    // Validate Order Item ID exists
    if (!validateOrderItemId(db, orderItemId)) {
      console.log(`  ❌ Order Item ID ${orderItemId} not found in database`);
      skipCount++;
      continue;
    }

    // Get current data before update
    const before = getCurrentOrderItem(db, orderItemId);

    // Prepare update statement
    const stmt = db.prepare(`
      UPDATE order_item
      SET 
        quantity = ?,
        delivery_required_date = ?,
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `);

    try {
      const result = stmt.run(quantity, deliveryDate, orderItemId);
      updateCount++;
      
      const change = {
        orderItemId,
        quantityBefore: before.quantity,
        quantityAfter: quantity,
        dateBefore: before.delivery_required_date,
        dateAfter: deliveryDate,
        changeTypes: []
      };

      // Track what changed
      if (before.quantity !== quantity && (before.quantity || null) !== quantity) {
        change.changeTypes.push('QUANTITY');
      }
      if (before.delivery_required_date !== deliveryDate) {
        change.changeTypes.push('DATE');
      }

      detailedChanges.push(change);
      updates.push({
        orderItemId,
        quantity: quantity || '(NULL)',
        deliveryDate: deliveryDate || '(NULL)',
        status: '✅'
      });
      console.log(`  ✅ Updated Order Item ${orderItemId}: qty=${quantity || '∅'}, date=${deliveryDate || '∅'}`);
    } catch (error) {
      console.log(`  ❌ Error updating Order Item ${orderItemId}: ${error.message}`);
      skipCount++;
    }
  }

  db.close();

  return { updateCount, skipCount, updates, detailedChanges };
}

/**
 * Main function
 */
async function main() {
  console.log('=' .repeat(70));
  console.log('🔄 UPDATE ORDER ITEMS FROM CSV');
  console.log('=' .repeat(70));

  console.log(`\n📂 CSV File: ${CSV_PATH}`);
  console.log(`📦 Database: ${DB_PATH}\n`);

  // Parse CSV
  console.log('📖 Reading and parsing CSV file...');
  const records = parseCSV();
  console.log(`✅ Parsed ${records.length} valid records\n`);

  if (records.length === 0) {
    console.log('⚠️  No valid records found. Exiting.');
    return;
  }

  // Show preview
  console.log('📋 Preview (first 10 records):');
  records.slice(0, 10).forEach(r => {
    console.log(`   ID: ${r.orderItemId}, Qty: ${r.quantity || '∅'}, Date: ${r.deliveryDate || '∅'}`);
  });
  console.log();

  // Update database
  const result = updateDatabase(records);

  // Generate detailed change report
  const changesByType = {
    qtyOnly: [],
    dateOnly: [],
    both: []
  };

  result.detailedChanges.forEach(change => {
    if (change.changeTypes.length === 1) {
      if (change.changeTypes[0] === 'QUANTITY') {
        changesByType.qtyOnly.push(change);
      } else {
        changesByType.dateOnly.push(change);
      }
    } else {
      changesByType.both.push(change);
    }
  });

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('✅ UPDATE COMPLETED');
  console.log('='.repeat(70));
  console.log(`Total processed: ${records.length}`);
  console.log(`✅ Successfully updated: ${result.updateCount}`);
  console.log(`❌ Skipped/Failed: ${result.skipCount}`);
  console.log('='.repeat(70) + '\n');

  // Detailed changes by type
  console.log('📝 DETAILED CHANGES BY TYPE:\n');

  if (changesByType.qtyOnly.length > 0) {
    console.log(`📌 QUANTITY ONLY (${changesByType.qtyOnly.length} items):`);
    changesByType.qtyOnly.forEach(c => {
      console.log(`   Order Item ${c.orderItemId}: ${c.quantityBefore || '∅'} → ${c.quantityAfter || '∅'}`);
    });
    console.log();
  }

  if (changesByType.dateOnly.length > 0) {
    console.log(`📌 DATE ONLY (${changesByType.dateOnly.length} items):`);
    changesByType.dateOnly.forEach(c => {
      console.log(`   Order Item ${c.orderItemId}: ${c.dateBefore || '∅'} → ${c.dateAfter || '∅'}`);
    });
    console.log();
  }

  if (changesByType.both.length > 0) {
    console.log(`📌 BOTH QUANTITY & DATE (${changesByType.both.length} items):`);
    changesByType.both.forEach(c => {
      console.log(`   Order Item ${c.orderItemId}:`);
      console.log(`      Qty:  ${c.quantityBefore || '∅'} → ${c.quantityAfter || '∅'}`);
      console.log(`      Date: ${c.dateBefore || '∅'} → ${c.dateAfter || '∅'}`);
    });
    console.log();
  }

  // Export detailed report to JSON
  const reportPath = path.join(__dirname, '../data/update-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      totalProcessed: records.length,
      successfulUpdates: result.updateCount,
      failedSkipped: result.skipCount
    },
    changesSummary: {
      quantityOnly: changesByType.qtyOnly.length,
      dateOnly: changesByType.dateOnly.length,
      both: changesByType.both.length
    },
    changes: {
      quantityOnly: changesByType.qtyOnly,
      dateOnly: changesByType.dateOnly,
      both: changesByType.both,
      all: result.detailedChanges
    }
  }, null, 2));

  console.log(`\n💾 Detailed report saved to: ${reportPath}`);
  console.log('\n✅ Update process completed successfully.\n');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
