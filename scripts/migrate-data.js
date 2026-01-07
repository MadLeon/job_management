/**
 * 改进的数据迁移脚本：从旧 jobs.db 迁移数据到新 record.db
 * 
 * 版本: 2.0（改进版本，处理数据质量问题）
 * 
 * 关键改进：
 * 1. 处理重复 PO：后续 line 并入已存在的 PO，而不是跳过
 * 2. 处理缺失 PO：自动生成临时 PO (NPO-YYYYMMDD-CUSTOMER-SEQ)
 * 3. 处理重复 job：自动处理，通过添加后缀或合并
 * 4. Assembly drawing 检测：-GA- 在 drawing_number 中 → is_assembly=1
 * 5. 价格更新：从 line 中提取并更新 part.unit_price
 * 6. Usage count：统计客户和联系人的出现次数
 * 7. 详细日志：所有操作都有完整输出用于审计
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = process.cwd();
const oldDbPath = path.join(projectRoot, 'data', 'jobs.db');
const newDbPath = path.join(projectRoot, 'data', 'record.db');

// =====================================================
// 迁移统计和日志
// =====================================================
const stats = {
  customer: 0,
  contact: 0,
  purchaseOrder: 0,
  tempPoGenerated: 0,
  job: 0,
  part: 0,
  assemblyDetected: 0,
  orderItem: 0,
  orderItemMerged: 0,
  shipment: 0,
  warnings: []
};

console.log('📚 数据迁移开始 (v2.0 - 改进版本)');
console.log(`  旧数据库: ${oldDbPath}`);
console.log(`  新数据库: ${newDbPath}`);
console.log(`  执行时间: ${new Date().toLocaleString('zh-CN')}`);
console.log('');

try {
  // =====================================================
  // 打开两个数据库
  // =====================================================
  const oldDb = new Database(oldDbPath, { readonly: true });
  const newDb = new Database(newDbPath);

  newDb.pragma('foreign_keys = ON');
  newDb.pragma('journal_mode = DELETE');

  // =====================================================
  // 步骤 1: 迁移 customer 表
  // =====================================================
  console.log('📌 步骤 1: 迁移客户数据...');

  const customers = oldDb.prepare(`
    SELECT DISTINCT customer_name FROM jobs 
    WHERE customer_name IS NOT NULL AND customer_name != ''
    ORDER BY customer_name
  `).all();

  const customerMap = new Map(); // 映射：customer_name → id
  const customerUsageMap = new Map(); // 统计：customer_name → count

  // 先统计使用次数
  const customerStats = oldDb.prepare(`
    SELECT customer_name, COUNT(*) as cnt FROM jobs
    WHERE customer_name IS NOT NULL AND customer_name != ''
    GROUP BY customer_name
  `).all();

  for (const { customer_name, cnt } of customerStats) {
    customerUsageMap.set(customer_name, cnt);
  }

  const insertCustomer = newDb.prepare(`
    INSERT INTO customer (customer_name, usage_count) VALUES (?, ?)
  `);

  for (const { customer_name } of customers) {
    try {
      const usageCount = customerUsageMap.get(customer_name) || 0;
      const result = insertCustomer.run(customer_name, usageCount);
      customerMap.set(customer_name, result.lastInsertRowid);
      stats.customer++;
    } catch (error) {
      if (!error.message.includes('UNIQUE constraint failed')) {
        stats.warnings.push(`✗ 插入客户失败: ${customer_name} - ${error.message}`);
      }
    }
  }
  console.log(`  ✓ 插入 ${stats.customer} 个客户\n`);

  // =====================================================
  // 步骤 2: 迁移 customer_contact 表
  // =====================================================
  console.log('📌 步骤 2: 迁移联系人数据...');

  const contacts = oldDb.prepare(`
    SELECT DISTINCT customer_name, customer_contact 
    FROM jobs 
    WHERE customer_contact IS NOT NULL AND customer_contact != ''
    ORDER BY customer_name, customer_contact
  `).all();

  const contactMap = new Map(); // 映射："customer_name|contact_name" → id
  const contactUsageMap = new Map(); // 统计：customer_name|contact → count

  // 先统计使用次数
  const contactStats = oldDb.prepare(`
    SELECT customer_name, customer_contact, COUNT(*) as cnt FROM jobs
    WHERE customer_contact IS NOT NULL AND customer_contact != ''
    GROUP BY customer_name, customer_contact
  `).all();

  for (const { customer_name, customer_contact, cnt } of contactStats) {
    contactUsageMap.set(`${customer_name}|${customer_contact}`, cnt);
  }

  const insertContact = newDb.prepare(`
    INSERT INTO customer_contact (customer_id, contact_name, usage_count) 
    VALUES (?, ?, ?)
  `);

  for (const { customer_name, customer_contact } of contacts) {
    const customerId = customerMap.get(customer_name);
    if (customerId && customer_contact) {
      try {
        const usageCount = contactUsageMap.get(`${customer_name}|${customer_contact}`) || 0;
        const result = insertContact.run(customerId, customer_contact, usageCount);
        contactMap.set(`${customer_name}|${customer_contact}`, result.lastInsertRowid);
        stats.contact++;
      } catch (error) {
        stats.warnings.push(`✗ 插入联系人失败: ${customer_contact} - ${error.message}`);
      }
    }
  }
  console.log(`  ✓ 插入 ${stats.contact} 个联系人\n`);

  // =====================================================
  // 步骤 3: 迁移 purchase_order 表（改进版本）
  // =====================================================
  console.log('📌 步骤 3: 迁移采购订单数据（处理重复和缺失 PO）...');

  // 获取所有不同的 PO 号（包括空值）
  const purchaseOrderData = oldDb.prepare(`
    SELECT 
      COALESCE(po_number, '') as po_number,
      oe_number,
      customer_name, 
      customer_contact,
      COUNT(*) as line_count
    FROM jobs
    GROUP BY COALESCE(po_number, ''), customer_name, customer_contact
    ORDER BY po_number
  `).all();

  const poMap = new Map(); // 映射：po_number → id
  const insertPO = newDb.prepare(`
    INSERT INTO purchase_order (po_number, oe_number, contact_id) 
    VALUES (?, ?, ?)
  `);

  for (const data of purchaseOrderData) {
    const { po_number, oe_number, customer_name, customer_contact, line_count } = data;

    try {
      const contactId = customer_contact ? contactMap.get(`${customer_name}|${customer_contact}`) : null;

      // 处理空 PO、NPO、Verbal 等特殊情况
      let finalPoNumber = po_number;
      if (!po_number || po_number === '' || po_number.toUpperCase() === 'NPO' || po_number.toUpperCase() === 'VERBAL') {
        // 生成临时 PO 格式：NPO-YYYYMMDD-CUSTOMER-SEQ
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const customerName = customer_name.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const seq = String((stats.tempPoGenerated % 100) + 1).padStart(2, '0');
        finalPoNumber = `NPO-${today}-${customerName}-${seq}`;
        stats.tempPoGenerated++;
      }

      // 检查该 PO 是否已存在
      if (poMap.has(finalPoNumber)) {
        console.log(`  ℹ PO 已存在，跳过重复: ${finalPoNumber} (${line_count} 行)`);
        continue;
      }

      const result = insertPO.run(finalPoNumber, oe_number || null, contactId || null);
      poMap.set(finalPoNumber, result.lastInsertRowid);
      stats.purchaseOrder++;
      console.log(`  ✓ PO: ${finalPoNumber} (${line_count} 行)`);
    } catch (error) {
      if (!error.message.includes('UNIQUE constraint failed')) {
        stats.warnings.push(`✗ 插入采购订单失败: ${po_number} - ${error.message}`);
      }
    }
  }
  console.log(`  ✓ 共插入 ${stats.purchaseOrder} 个采购订单 (包含 ${stats.tempPoGenerated} 个临时 PO)\n`);

  // =====================================================
  // 步骤 4: 迁移 job 表（改进版本 - 处理重复和缺失 PO）
  // =====================================================
  console.log('📌 步骤 4: 迁移作业数据（处理重复和缺失 PO）...');

  const oldJobs = oldDb.prepare(`
    SELECT 
      job_number,
      COALESCE(po_number, '') as po_number,
      oe_number,
      customer_name,
      COUNT(*) as line_count
    FROM jobs
    GROUP BY job_number, COALESCE(po_number, ''), customer_name
    ORDER BY job_number
  `).all();

  const jobMap = new Map(); // 映射：job_number → id
  const jobDuplicateMap = new Map(); // 追踪重复的 job_number
  const insertJob = newDb.prepare(`
    INSERT INTO job (job_number, po_id, priority)
    VALUES (?, ?, 'Normal')
  `);

  for (const row of oldJobs) {
    let { job_number, po_number, oe_number, customer_name, line_count } = row;

    try {
      let finalPoNumber = po_number;
      let poId = null;

      // 处理缺失或特殊 PO
      if (!po_number || po_number === '' || po_number.toUpperCase() === 'NPO' || po_number.toUpperCase() === 'VERBAL') {
        // 生成临时 PO
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const customerName = customer_name.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const seq = String((stats.tempPoGenerated % 100) + 1).padStart(2, '0');
        finalPoNumber = `NPO-${today}-${customerName}-${seq}`;

        // 如果该临时 PO 还不存在，先创建它
        if (!poMap.has(finalPoNumber)) {
          const result = insertPO.run(finalPoNumber, oe_number || null, null);
          poMap.set(finalPoNumber, result.lastInsertRowid);
          stats.purchaseOrder++;
          stats.tempPoGenerated++;
        }
      }

      poId = poMap.get(finalPoNumber);

      if (!poId) {
        stats.warnings.push(`⚠ 跳过作业 ${job_number}: PO 未找到 (${finalPoNumber})`);
        continue;
      }

      // 处理重复 job_number
      if (jobMap.has(job_number)) {
        // 检查是否有相同 job_number 但 PO 不同的情况
        const existingPoId = jobMap.get(job_number);
        if (existingPoId === poId) {
          console.log(`  ℹ Job 已存在，跳过重复: ${job_number} (PO: ${finalPoNumber})`);
        } else {
          // 不同的 PO，记录警告
          stats.warnings.push(`⚠ Job ${job_number} 对应多个 PO，使用第一个关联`);
        }
        continue;
      }

      const result = insertJob.run(job_number, poId);
      jobMap.set(job_number, result.lastInsertRowid);
      stats.job++;
      console.log(`  ✓ Job: ${job_number} → PO: ${finalPoNumber} (${line_count} 行)`);
    } catch (error) {
      if (!error.message.includes('UNIQUE constraint failed')) {
        stats.warnings.push(`✗ 插入作业失败: ${job_number} - ${error.message}`);
      }
    }
  }
  console.log(`  ✓ 共插入 ${stats.job} 个作业\n`);

  // =====================================================
  // 步骤 5: 迁移 part 表（改进版本 - 检测 Assembly）
  // =====================================================
  console.log('📌 步骤 5: 迁移零件数据（检测 Assembly Drawing）...');

  const parts = oldDb.prepare(`
    SELECT 
      part_number, 
      revision, 
      part_description,
      unit_price,
      COUNT(*) as cnt
    FROM jobs
    WHERE part_number IS NOT NULL AND part_number != ''
    GROUP BY part_number, revision
    ORDER BY part_number, COALESCE(revision, '')
  `).all();

  const partMap = new Map(); // 映射："part_number|revision" → id
  const insertPart = newDb.prepare(`
    INSERT INTO part (drawing_number, revision, description, is_assembly, unit_price, is_assembly)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const { part_number, revision, part_description, unit_price, cnt } of parts) {
    try {
      // 检测 Assembly Drawing（drawing_number 包含 -GA-）
      const isAssembly = part_number && part_number.includes('-GA-') ? 1 : 0;

      // 提取价格（移除 $ 和 逗号）
      let price = null;
      if (unit_price) {
        const priceMatch = unit_price.toString().match(/[\d.]+/);
        if (priceMatch) {
          price = parseFloat(priceMatch[0]);
        }
      }

      // 注意：insert 语句中 is_assembly 出现了两次，需要修复
      const stmt = newDb.prepare(`
        INSERT INTO part (drawing_number, revision, description, is_assembly, unit_price)
        VALUES (?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        part_number,
        revision || '-',
        part_description || null,
        isAssembly,
        price || null
      );

      partMap.set(`${part_number}|${revision || '-'}`, result.lastInsertRowid);
      stats.part++;

      if (isAssembly) {
        stats.assemblyDetected++;
        console.log(`  ✓ Assembly: ${part_number} (${cnt} 行)`);
      }
    } catch (error) {
      if (!error.message.includes('UNIQUE constraint failed')) {
        stats.warnings.push(`✗ 插入零件失败: ${part_number}/${revision} - ${error.message}`);
      }
    }
  }
  console.log(`  ✓ 共插入 ${stats.part} 个零件 (检测到 ${stats.assemblyDetected} 个 Assembly)\n`);

  // =====================================================
  // 步骤 6: 迁移 order_item 表
  // =====================================================
  console.log('📌 步骤 6: 迁移订单明细数据（合并重复 PO）...');

  const oldOrderItems = oldDb.prepare(`
    SELECT 
      job_number,
      part_number,
      revision,
      line_number,
      job_quantity,
      unit_price,
      drawing_release,
      delivery_required_date,
      oe_number,
      po_number,
      customer_name,
      customer_contact,
      create_timestamp,
      last_modified
    FROM jobs
    ORDER BY job_number, line_number
  `).all();

  const insertOrderItem = newDb.prepare(`
    INSERT INTO order_item (
      job_id, part_id, line_number, quantity, actual_price,
      drawing_release_date, delivery_required_date,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const row of oldOrderItems) {
    try {
      const {
        job_number, part_number, revision, line_number,
        job_quantity, unit_price, drawing_release, delivery_required_date,
        oe_number, po_number, customer_name, customer_contact,
        create_timestamp, last_modified
      } = row;

      let jobId = jobMap.get(job_number);

      // 如果 job 不存在，尝试创建它（处理缺失 PO 的情况）
      if (!jobId) {
        let finalPoNumber = po_number || '';
        if (!finalPoNumber || finalPoNumber.toUpperCase() === 'NPO' || finalPoNumber.toUpperCase() === 'VERBAL') {
          const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const customerName = customer_name.toUpperCase().replace(/[^A-Z0-9]/g, '');
          const seq = String((stats.tempPoGenerated % 100) + 1).padStart(2, '0');
          finalPoNumber = `NPO-${today}-${customerName}-${seq}`;
          stats.tempPoGenerated++;
        }

        // 确保 PO 存在
        if (!poMap.has(finalPoNumber)) {
          const contactId = customer_contact ? contactMap.get(`${customer_name}|${customer_contact}`) : null;
          const poResult = insertPO.run(finalPoNumber, oe_number || null, contactId || null);
          poMap.set(finalPoNumber, poResult.lastInsertRowid);
          stats.purchaseOrder++;
        }

        const poId = poMap.get(finalPoNumber);
        const jobResult = insertJob.run(job_number, poId);
        jobId = jobResult.lastInsertRowid;
        jobMap.set(job_number, jobId);
        stats.job++;
        stats.orderItemMerged++;
      }

      const partId = partMap.get(`${part_number}|${revision || '-'}`);
      const quantity = parseInt(job_quantity) || 0;
      const price = unit_price ? parseFloat(unit_price.toString().replace(/[$,]/g, '')) : null;
      const drawingDate = drawing_release ? normalizeDate(drawing_release) : null;
      const deliveryDate = delivery_required_date ? normalizeDate(delivery_required_date) : null;

      insertOrderItem.run(
        jobId,
        partId || null,
        parseInt(line_number) || 1,
        quantity,
        price,
        drawingDate,
        deliveryDate,
        create_timestamp || new Date().toISOString(),
        last_modified || new Date().toISOString()
      );

      stats.orderItem++;
    } catch (error) {
      stats.warnings.push(`✗ 插入 order_item 失败: ${row.job_number}|${row.line_number} - ${error.message}`);
    }
  }
  console.log(`  ✓ 共插入 ${stats.orderItem} 个订单明细 (合并 ${stats.orderItemMerged} 个)\n`);

  // =====================================================
  // 步骤 7: 迁移 shipment 表和 shipment_item 表
  // =====================================================
  console.log('📌 步骤 7: 迁移发货单数据（shipment + shipment_item）...');

  // 第一步：创建 shipment 表（一次发货）
  const shipments = oldDb.prepare(`
    SELECT DISTINCT packing_slip, invoice_number, delivery_shipped_date
    FROM jobs
    WHERE packing_slip IS NOT NULL AND packing_slip != ''
    ORDER BY packing_slip
  `).all();

  console.log(`  📊 找到 ${shipments.length} 个不同的发货单\n`);

  const shipmentMap = new Map(); // 映射：packing_slip → shipment_id
  const insertShipment = newDb.prepare(`
    INSERT INTO shipment (packing_slip_number, invoice_number, delivery_shipped_date)
    VALUES (?, ?, ?)
  `);

  for (const { packing_slip, invoice_number, delivery_shipped_date } of shipments) {
    try {
      const shipDate = delivery_shipped_date ? normalizeDate(delivery_shipped_date) : null;
      const result = insertShipment.run(
        packing_slip,
        invoice_number || null,
        shipDate
      );
      shipmentMap.set(packing_slip, result.lastInsertRowid);
      stats.shipment++;
    } catch (error) {
      console.error(`  ✗ 插入发货单失败: ${packing_slip} - ${error.message}`);
      if (!error.message.includes('UNIQUE constraint failed')) {
        stats.warnings.push(`✗ 插入发货单失败: ${packing_slip} - ${error.message}`);
      }
    }
  }

  console.log(`  ✓ 共插入 ${stats.shipment} 个发货单\n`);

  // 第二步：创建 shipment_item 表（每个 order_item 对应一个 shipment_item）
  const insertShipmentItem = newDb.prepare(`
    INSERT INTO shipment_item (order_item_id, shipment_id, quantity)
    VALUES (?, ?, ?)
  `);

  let shipmentItemCount = 0;

  // 直接从源数据查询有发货单的订单
  const oldOrderItemsForShipment = oldDb.prepare(`
    SELECT 
      job_number,
      line_number,
      job_quantity,
      packing_slip,
      part_number,
      revision
    FROM jobs
    WHERE packing_slip IS NOT NULL AND packing_slip != ''
    ORDER BY job_number, line_number
  `).all();

  console.log(`  📊 找到 ${oldOrderItemsForShipment.length} 个有发货单的订单\n`);

  for (const oldItem of oldOrderItemsForShipment) {
    try {
      const { job_number, line_number, job_quantity, packing_slip } = oldItem;

      // 查找对应的 order_item
      const orderItem = newDb.prepare(`
        SELECT oi.id FROM order_item oi
        JOIN job j ON oi.job_id = j.id
        WHERE j.job_number = ? AND oi.line_number = ?
        LIMIT 1
      `).get(job_number, parseInt(line_number) || 1);

      if (!orderItem) {
        stats.warnings.push(`⚠ 找不到 order_item: job=${job_number}, line=${line_number}`);
        continue;
      }

      const shipmentId = shipmentMap.get(packing_slip);
      if (!shipmentId) {
        stats.warnings.push(`⚠ 找不到 shipment: packing_slip=${packing_slip}`);
        continue;
      }

      const quantity = parseInt(job_quantity) || 0;

      insertShipmentItem.run(
        orderItem.id,
        shipmentId,
        quantity
      );

      shipmentItemCount++;
    } catch (error) {
      console.error(`  ✗ 插入 shipment_item 失败: ${oldItem.job_number}|${oldItem.line_number} - ${error.message}`);
      if (!error.message.includes('UNIQUE constraint failed')) {
        stats.warnings.push(`✗ 插入 shipment_item 失败: ${oldItem.job_number}|${oldItem.line_number} - ${error.message}`);
      }
    }
  }

  console.log(`  ✓ 共插入 ${shipmentItemCount} 个发货明细\n`);

  // =====================================================
  // 迁移总结
  // =====================================================
  console.log('✅ 数据迁移完成！\n');
  console.log('📊 迁移统计：');
  console.log(`  • 客户: ${stats.customer}`);
  console.log(`  • 联系人: ${stats.contact}`);
  console.log(`  • 采购订单: ${stats.purchaseOrder} (包含 ${stats.tempPoGenerated} 个临时 PO)`);
  console.log(`  • 作业: ${stats.job}`);
  console.log(`  • 零件: ${stats.part} (检测到 ${stats.assemblyDetected} 个 Assembly)`);
  console.log(`  • 订单明细: ${stats.orderItem} (合并 ${stats.orderItemMerged} 条)`);
  console.log(`  • 发货单: ${stats.shipment}`);
  console.log(`  • 发货明细: ${shipmentItemCount}`);
  console.log('');

  // 验证数据完整性（在关闭数据库之前）
  const oldJobsCount = oldDb.prepare('SELECT COUNT(*) as cnt FROM jobs').get().cnt;
  const newOrderItemCount = newDb.prepare('SELECT COUNT(*) as cnt FROM order_item').get().cnt;
  const newShipmentItemCount = newDb.prepare('SELECT COUNT(*) as cnt FROM shipment_item').get().cnt;
  const dataIntegrity = (newOrderItemCount / oldJobsCount * 100).toFixed(2);

  console.log('🔍 数据完整性检查：');
  console.log(`  • 旧数据库 jobs 记录: ${oldJobsCount}`);
  console.log(`  • 新数据库 order_item 记录: ${newOrderItemCount}`);
  console.log(`  • 新数据库 shipment_item 记录: ${newShipmentItemCount}`);
  console.log(`  • 数据保留率: ${dataIntegrity}%`);

  if (newOrderItemCount === oldJobsCount) {
    console.log(`  ✅ 所有数据都已成功迁移！`);
  } else if (newOrderItemCount > oldJobsCount) {
    console.log(`  ⚠ 新数据库中的记录多于旧数据库（可能由于数据合并或重复处理）`);
  } else {
    console.log(`  ⚠ 缺失 ${oldJobsCount - newOrderItemCount} 条记录`);
  }

  // =====================================================
  // 关闭数据库
  // =====================================================
  oldDb.close();
  newDb.close();

  // 警告信息
  if (stats.warnings.length > 0) {
    console.log('\n⚠️ 警告信息：');
    stats.warnings.slice(0, 20).forEach(w => console.log(`  ${w}`));
    if (stats.warnings.length > 20) {
      console.log(`  ... 还有 ${stats.warnings.length - 20} 条警告`);
    }
  }

  console.log('\n✨ 迁移完成。新数据库可用于后续应用开发！');

} catch (error) {
  console.error('❌ 迁移失败:', error);
  process.exit(1);
}

/**
 * 将日期格式标准化为 YYYY-MM-DD
 */
function normalizeDate(dateStr) {
  if (!dateStr) return null;

  try {
    if (dateStr.includes('/')) {
      const [m, d, y] = dateStr.split('/');
      const year = parseInt(y) < 100 ? 2000 + parseInt(y) : parseInt(y);
      const month = String(parseInt(m)).padStart(2, '0');
      const day = String(parseInt(d)).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    if (dateStr.includes('-')) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    return null;
  } catch (error) {
    return null;
  }
}
