#!/usr/bin/env node

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const dbPath = path.join(projectRoot, 'data', 'record.db');

console.log('🔍 Cleanup script: Removing all records created on 2026-01-24\n');
console.log('Database path:', dbPath);

try {
  const db = new Database(dbPath);
  
  // 1. Find order_item records from 2026-01-24
  console.log('\n📋 Order Item records to be deleted:');
  const orderItemsToDelete = db.prepare(
    `SELECT id, job_id, part_id, delivery_required_date, created_at 
     FROM order_item 
     WHERE created_at LIKE '2026-01-24%'`
  ).all();
  
  if (orderItemsToDelete.length === 0) {
    console.log('  (No order_item records found)');
  } else {
    orderItemsToDelete.forEach((record, index) => {
      console.log(`  ${index + 1}. ID: ${record.id}, Job ID: ${record.job_id}, Created: ${record.created_at}`);
    });
  }
  
  // 2. Find job records from 2026-01-24
  console.log('\n📋 Job records to be deleted:');
  const jobsToDelete = db.prepare(
    `SELECT id, job_number, po_id, created_at 
     FROM job 
     WHERE created_at LIKE '2026-01-24%'`
  ).all();
  
  if (jobsToDelete.length === 0) {
    console.log('  (No job records found)');
  } else {
    jobsToDelete.forEach((record, index) => {
      console.log(`  ${index + 1}. Job ID: ${record.id}, Job Number: ${record.job_number}, PO ID: ${record.po_id}, Created: ${record.created_at}`);
    });
  }
  
  // 3. Find purchase_order records from 2026-01-24
  console.log('\n📋 Purchase Order records to be deleted:');
  const posToDelete = db.prepare(
    `SELECT id, po_number, oe_number, created_at 
     FROM purchase_order 
     WHERE created_at LIKE '2026-01-24%'`
  ).all();
  
  if (posToDelete.length === 0) {
    console.log('  (No purchase order records found)');
  } else {
    posToDelete.forEach((record, index) => {
      console.log(`  ${index + 1}. PO ID: ${record.id}, PO Number: ${record.po_number}, OE Number: ${record.oe_number}, Created: ${record.created_at}`);
    });
  }
  
  const totalCount = orderItemsToDelete.length + jobsToDelete.length + posToDelete.length;
  if (totalCount === 0) {
    console.log('\n⚠️  No records found to delete.');
    db.close();
    process.exit(0);
  }
  
  console.log(`\n⚠️  Total: ${orderItemsToDelete.length} order_item + ${jobsToDelete.length} job + ${posToDelete.length} PO = ${totalCount} record(s) will be deleted.\n`);
  
  // Delete in correct order due to foreign key constraints:
  // order_item → job → purchase_order
  
  console.log('🗑️  Deleting order_item records...');
  const orderItemDeleteStmt = db.prepare(
    `DELETE FROM order_item WHERE created_at LIKE '2026-01-24%'`
  );
  const orderItemResult = orderItemDeleteStmt.run();
  console.log(`   ✓ Order item records deleted: ${orderItemResult.changes}`);
  
  console.log('🗑️  Deleting job records...');
  const jobDeleteStmt = db.prepare(
    `DELETE FROM job WHERE created_at LIKE '2026-01-24%'`
  );
  const jobResult = jobDeleteStmt.run();
  console.log(`   ✓ Job records deleted: ${jobResult.changes}`);
  
  console.log('🗑️  Deleting purchase_order records...');
  const poDeleteStmt = db.prepare(
    `DELETE FROM purchase_order WHERE created_at LIKE '2026-01-24%'`
  );
  const poResult = poDeleteStmt.run();
  console.log(`   ✓ Purchase order records deleted: ${poResult.changes}`);
  
  console.log(`\n✅ Cleanup complete!`);
  console.log(`   Total rows deleted: ${orderItemResult.changes + jobResult.changes + poResult.changes}`);
  
  db.close();
  console.log('\n✓ Database connection closed');
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
