/**
 * 迁移 006: 从 jobs.db 迁移所有业务数据到 record.db
 * 
 * 这个迁移执行以下步骤：
 * 1. 迁移客户数据 (customer)
 * 2. 迁移联系人数据 (customer_contact)
 * 3. 迁移采购订单数据 (purchase_order)，处理缺失和重复 PO
 * 4. 迁移作业数据 (job)
 * 5. 迁移零件数据 (part)，检测 Assembly
 * 6. 迁移订单明细 (order_item)
 * 7. 迁移发货数据 (shipment + shipment_item)
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const name = '006_migrate_data_from_jobs_db';

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

export function up(db) {
  // 打开源数据库（只读）
  const projectRoot = process.cwd();
  const oldDbPath = path.join(projectRoot, 'data', 'jobs.db');

  const oldDb = new Database(oldDbPath, { readonly: true });

  const stats = {
    customer: 0,
    contact: 0,
    purchaseOrder: 0,
    tempPoGenerated: 0,
    job: 0,
    part: 0,
    assemblyDetected: 0,
    orderItem: 0,
    shipment: 0,
    shipmentItem: 0,
    warnings: []
  };

  console.log('📚 [006 迁移] 从 jobs.db 迁移数据开始...');
  console.log(`  源数据库: ${oldDbPath}`);
  console.log('');

  try {
    // =====================================================
    // 步骤 1: 迁移 customer 表
    // =====================================================
    console.log('📌 步骤 1: 迁移客户数据...');

    const customers = oldDb.prepare(`
      SELECT DISTINCT customer_name FROM jobs 
      WHERE customer_name IS NOT NULL AND customer_name != ''
      ORDER BY customer_name
    `).all();

    const customerMap = new Map();
    const customerUsageMap = new Map();

    // 先统计使用次数
    const customerStats = oldDb.prepare(`
      SELECT customer_name, COUNT(*) as cnt FROM jobs
      WHERE customer_name IS NOT NULL AND customer_name != ''
      GROUP BY customer_name
    `).all();

    for (const { customer_name, cnt } of customerStats) {
      customerUsageMap.set(customer_name, cnt);
    }

    const insertCustomer = db.prepare(`
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
          stats.warnings.push(`✗ 插入客户失败: ${customer_name}`);
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

    const contactMap = new Map();
    const contactUsageMap = new Map();

    const contactStats = oldDb.prepare(`
      SELECT customer_name, customer_contact, COUNT(*) as cnt FROM jobs
      WHERE customer_contact IS NOT NULL AND customer_contact != ''
      GROUP BY customer_name, customer_contact
    `).all();

    for (const { customer_name, customer_contact, cnt } of contactStats) {
      contactUsageMap.set(`${customer_name}|${customer_contact}`, cnt);
    }

    const insertContact = db.prepare(`
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
          stats.warnings.push(`✗ 插入联系人失败: ${customer_contact}`);
        }
      }
    }
    console.log(`  ✓ 插入 ${stats.contact} 个联系人\n`);

    // =====================================================
    // 步骤 3: 迁移 purchase_order 表
    // =====================================================
    console.log('📌 步骤 3: 迁移采购订单数据（处理缺失 PO）...');

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

    const poMap = new Map();
    const insertPO = db.prepare(`
      INSERT INTO purchase_order (po_number, oe_number, contact_id) 
      VALUES (?, ?, ?)
    `);

    for (const data of purchaseOrderData) {
      const { po_number, oe_number, customer_name, customer_contact, line_count } = data;

      try {
        const contactId = customer_contact ? contactMap.get(`${customer_name}|${customer_contact}`) : null;

        let finalPoNumber = po_number;
        if (!po_number || po_number === '' || po_number.toUpperCase() === 'NPO' || po_number.toUpperCase() === 'VERBAL') {
          const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const customerName = customer_name.toUpperCase().replace(/[^A-Z0-9]/g, '');
          const seq = String((stats.tempPoGenerated % 100) + 1).padStart(2, '0');
          finalPoNumber = `NPO-${today}-${customerName}-${seq}`;
          stats.tempPoGenerated++;
        }

        if (poMap.has(finalPoNumber)) {
          continue;
        }

        const result = insertPO.run(finalPoNumber, oe_number || null, contactId || null);
        poMap.set(finalPoNumber, result.lastInsertRowid);
        stats.purchaseOrder++;
      } catch (error) {
        if (!error.message.includes('UNIQUE constraint failed')) {
          stats.warnings.push(`✗ 插入采购订单失败: ${po_number}`);
        }
      }
    }
    console.log(`  ✓ 共插入 ${stats.purchaseOrder} 个采购订单 (包含 ${stats.tempPoGenerated} 个临时 PO)\n`);

    // =====================================================
    // 步骤 4: 迁移 job 表
    // =====================================================
    console.log('📌 步骤 4: 迁移作业数据...');

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

    const jobMap = new Map();
    const insertJob = db.prepare(`
      INSERT INTO job (job_number, po_id, priority)
      VALUES (?, ?, 'Normal')
    `);

    for (const row of oldJobs) {
      let { job_number, po_number, oe_number, customer_name } = row;

      try {
        let finalPoNumber = po_number;
        let poId = null;

        if (!po_number || po_number === '' || po_number.toUpperCase() === 'NPO' || po_number.toUpperCase() === 'VERBAL') {
          const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const customerName = customer_name.toUpperCase().replace(/[^A-Z0-9]/g, '');
          const seq = String((stats.tempPoGenerated % 100) + 1).padStart(2, '0');
          finalPoNumber = `NPO-${today}-${customerName}-${seq}`;

          if (!poMap.has(finalPoNumber)) {
            // ✅ 修复：查询原始数据中该 job_number 对应的 customer_contact，获取正确的 contact_id
            const jobContactInfo = oldDb.prepare(`
              SELECT customer_contact FROM jobs WHERE job_number = ? LIMIT 1
            `).get(job_number);

            const contactId = jobContactInfo?.customer_contact
              ? contactMap.get(`${customer_name}|${jobContactInfo.customer_contact}`)
              : null;

            const result = insertPO.run(finalPoNumber, oe_number || null, contactId || null);
            poMap.set(finalPoNumber, result.lastInsertRowid);
            stats.purchaseOrder++;
            stats.tempPoGenerated++;
          }
        }

        poId = poMap.get(finalPoNumber);

        if (!poId) {
          stats.warnings.push(`⚠ 跳过作业 ${job_number}: PO 未找到`);
          continue;
        }

        if (jobMap.has(job_number)) {
          continue;
        }

        const result = insertJob.run(job_number, poId);
        jobMap.set(job_number, result.lastInsertRowid);
        stats.job++;
      } catch (error) {
        if (!error.message.includes('UNIQUE constraint failed')) {
          stats.warnings.push(`✗ 插入作业失败: ${job_number}`);
        }
      }
    }
    console.log(`  ✓ 共插入 ${stats.job} 个作业\n`);

    // =====================================================
    // 步骤 5: 迁移 part 表（检测 Assembly）
    // =====================================================
    console.log('📌 步骤 5: 迁移零件数据（检测 Assembly）...');

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

    const partMap = new Map();
    const insertPart = db.prepare(`
      INSERT INTO part (drawing_number, revision, description, is_assembly, unit_price)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const { part_number, revision, part_description, unit_price } of parts) {
      try {
        const isAssembly = part_number && part_number.includes('-GA-') ? 1 : null;

        let price = null;
        if (unit_price) {
          const priceMatch = unit_price.toString().match(/[\d.]+/);
          if (priceMatch) {
            price = parseFloat(priceMatch[0]);
          }
        }

        const result = insertPart.run(
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
        }
      } catch (error) {
        if (!error.message.includes('UNIQUE constraint failed')) {
          stats.warnings.push(`✗ 插入零件失败: ${part_number}`);
        }
      }
    }
    console.log(`  ✓ 共插入 ${stats.part} 个零件 (检测到 ${stats.assemblyDetected} 个 Assembly)\n`);

    // =====================================================
    // 步骤 6: 迁移 order_item 表
    // =====================================================
    console.log('📌 步骤 6: 迁移订单明细数据...');

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

    const insertOrderItem = db.prepare(`
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

        if (!jobId) {
          let finalPoNumber = po_number || '';
          if (!finalPoNumber || finalPoNumber.toUpperCase() === 'NPO' || finalPoNumber.toUpperCase() === 'VERBAL') {
            const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const customerName = customer_name.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const seq = String((stats.tempPoGenerated % 100) + 1).padStart(2, '0');
            finalPoNumber = `NPO-${today}-${customerName}-${seq}`;
            stats.tempPoGenerated++;
          }

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
        stats.warnings.push(`✗ 插入 order_item 失败: ${row.job_number}`);
      }
    }
    console.log(`  ✓ 共插入 ${stats.orderItem} 个订单明细\n`);

    // =====================================================
    // 步骤 7: 迁移 shipment 表和 shipment_item 表
    // =====================================================
    console.log('📌 步骤 7: 迁移发货单数据...');

    const shipments = oldDb.prepare(`
      SELECT DISTINCT packing_slip, invoice_number, delivery_shipped_date
      FROM jobs
      WHERE packing_slip IS NOT NULL AND packing_slip != ''
      ORDER BY packing_slip
    `).all();

    const shipmentMap = new Map();
    const insertShipment = db.prepare(`
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
        if (!error.message.includes('UNIQUE constraint failed')) {
          stats.warnings.push(`✗ 插入发货单失败: ${packing_slip}`);
        }
      }
    }

    const insertShipmentItem = db.prepare(`
      INSERT INTO shipment_item (order_item_id, shipment_id, quantity)
      VALUES (?, ?, ?)
    `);

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

    for (const oldItem of oldOrderItemsForShipment) {
      try {
        const { job_number, line_number, job_quantity, packing_slip } = oldItem;

        const orderItem = db.prepare(`
          SELECT oi.id FROM order_item oi
          JOIN job j ON oi.job_id = j.id
          WHERE j.job_number = ? AND oi.line_number = ?
          LIMIT 1
        `).get(job_number, parseInt(line_number) || 1);

        if (!orderItem) {
          stats.warnings.push(`⚠ 找不到 order_item: job=${job_number}`);
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

        stats.shipmentItem++;
      } catch (error) {
        stats.warnings.push(`✗ 插入 shipment_item 失败: ${oldItem.job_number}`);
      }
    }

    console.log(`  ✓ 共插入 ${stats.shipment} 个发货单和 ${stats.shipmentItem} 个发货明细\n`);

    // =====================================================
    // 迁移完成
    // =====================================================
    console.log('✅ [006 迁移] 数据迁移完成！');
    console.log('📊 迁移统计：');
    console.log(`  • 客户: ${stats.customer}`);
    console.log(`  • 联系人: ${stats.contact}`);
    console.log(`  • 采购订单: ${stats.purchaseOrder} (临时 PO: ${stats.tempPoGenerated})`);
    console.log(`  • 作业: ${stats.job}`);
    console.log(`  • 零件: ${stats.part} (Assembly: ${stats.assemblyDetected})`);
    console.log(`  • 订单明细: ${stats.orderItem}`);
    console.log(`  • 发货单: ${stats.shipment}`);
    console.log(`  • 发货明细: ${stats.shipmentItem}`);

    if (stats.warnings.length > 0) {
      console.log(`\n⚠️ 警告 (${stats.warnings.length} 条):`);
      stats.warnings.slice(0, 10).forEach(w => console.log(`  ${w}`));
      if (stats.warnings.length > 10) {
        console.log(`  ... 还有 ${stats.warnings.length - 10} 条警告`);
      }
    }

    console.log('');
  } finally {
    oldDb.close();
  }
}

export function down(db) {
  // 回滚：删除所有迁移的数据
  console.log('📌 回滚 [006 迁移]...');

  db.prepare('DELETE FROM shipment_item').run();
  db.prepare('DELETE FROM shipment').run();
  db.prepare('DELETE FROM order_item').run();
  db.prepare('DELETE FROM part').run();
  db.prepare('DELETE FROM job').run();
  db.prepare('DELETE FROM purchase_order').run();
  db.prepare('DELETE FROM customer_contact').run();
  db.prepare('DELETE FROM customer').run();

  console.log('✓ [006 迁移] 已回滚');
}
