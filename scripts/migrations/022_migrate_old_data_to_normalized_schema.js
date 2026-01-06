/**
 * 迁移 022: 从旧的 jobs.db 迁移数据到新规范化数据库
 * 
 * 策略:
 *   1. 提取现有 jobs 表中的客户信息，创建 customer 记录
 *   2. 创建虚拟的 purchase_order （从 jobs.po_number 提取）
 *   3. 为每条 jobs 记录创建对应的 job + order_item
 *   4. 从 drawings 和 assemblies 表迁移零件信息到 part 表
 *   5. 处理发货信息到 shipment 和 shipment_item
 * 
 * 注意:
 *   - 原 jobs 表的 unique_key = job_number|line_number
 *   - 一个 job_number 可能对应多个 line_number
 *   - 需要在此次迁移中正确分组
 */

export const name = '022_migrate_old_data_to_normalized_schema';

/**
 * 辅助函数：解析日期
 * 处理多种日期格式
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  // 已经是 YYYY-MM-DD 格式
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  // 尝试解析其他格式并转换为 YYYY-MM-DD
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().split('T')[0];
}

export function up(db) {
  try {
    console.log('开始数据迁移...\n');

    // ========================================================================
    // 步骤 1: 迁移客户数据
    // ========================================================================
    console.log('步骤 1: 迁移客户数据...');
    
    const uniqueCustomers = db
      .prepare(`SELECT DISTINCT customer_name FROM jobs WHERE customer_name IS NOT NULL AND customer_name != ''`)
      .all();
    
    let customerCount = 0;
    const customerMap = {}; // customer_name -> id
    
    for (const row of uniqueCustomers) {
      const { customer_name } = row;
      try {
        const stmt = db.prepare(`
          INSERT INTO customer (customer_name, usage_count, last_used, created_at, updated_at)
          VALUES (?, 0, NULL, datetime('now', 'localtime'), datetime('now', 'localtime'))
        `);
        const result = stmt.run(customer_name);
        customerMap[customer_name] = result.lastInsertRowid;
        customerCount++;
      } catch (e) {
        // 重复客户已存在，跳过
        const existingCustomer = db
          .prepare(`SELECT id FROM customer WHERE customer_name = ?`)
          .get(customer_name);
        if (existingCustomer) {
          customerMap[customer_name] = existingCustomer.id;
        }
      }
    }
    console.log(`  ✓ 迁移 ${customerCount} 个客户\n`);

    // ========================================================================
    // 步骤 2: 迁移采购订单数据
    // ========================================================================
    console.log('步骤 2: 迁移采购订单数据...');
    
    const uniquePOs = db
      .prepare(`
        SELECT DISTINCT po_number, oe_number
        FROM jobs
        WHERE po_number IS NOT NULL AND po_number != ''
      `)
      .all();
    
    let poCount = 0;
    const poMap = {}; // po_number -> id
    
    for (const row of uniquePOs) {
      const { po_number, oe_number } = row;
      try {
        const stmt = db.prepare(`
          INSERT INTO purchase_order (po_number, oe_number, contact_id, is_active, created_at, updated_at)
          VALUES (?, ?, NULL, 1, datetime('now', 'localtime'), datetime('now', 'localtime'))
        `);
        const result = stmt.run(po_number, oe_number);
        poMap[po_number] = result.lastInsertRowid;
        poCount++;
      } catch (e) {
        // 重复 PO 号，跳过
        const existingPO = db
          .prepare(`SELECT id FROM purchase_order WHERE po_number = ?`)
          .get(po_number);
        if (existingPO) {
          poMap[po_number] = existingPO.id;
        }
      }
    }
    console.log(`  ✓ 迁移 ${poCount} 个采购订单\n`);

    // ========================================================================
    // 步骤 3: 迁移零件数据
    // ========================================================================
    console.log('步骤 3: 迁移零件数据...');
    
    const uniqueParts = db
      .prepare(`
        SELECT DISTINCT part_number, revision, part_description
        FROM jobs
        WHERE part_number IS NOT NULL AND part_number != ''
      `)
      .all();
    
    let partCount = 0;
    const partMap = {}; // (part_number, revision) -> id
    
    for (const row of uniqueParts) {
      const { part_number, revision, part_description } = row;
      const rev = revision || '-';
      const key = `${part_number}|${rev}`;
      
      try {
        const stmt = db.prepare(`
          INSERT INTO part (drawing_number, revision, description, is_assembly, created_at, updated_at)
          VALUES (?, ?, ?, 0, datetime('now', 'localtime'), datetime('now', 'localtime'))
        `);
        const result = stmt.run(part_number, rev, part_description);
        partMap[key] = result.lastInsertRowid;
        partCount++;
      } catch (e) {
        // 重复零件，跳过
        const existingPart = db
          .prepare(`SELECT id FROM part WHERE drawing_number = ? AND revision = ?`)
          .get(part_number, rev);
        if (existingPart) {
          partMap[key] = existingPart.id;
        }
      }
    }
    console.log(`  ✓ 迁移 ${partCount} 个零件\n`);

    // ========================================================================
    // 步骤 4: 迁移作业和订单明细数据
    // ========================================================================
    console.log('步骤 4: 迁移作业和订单明细数据...');
    
    const jobsData = db.prepare(`
      SELECT 
        job_number, po_number, line_number, part_number, revision,
        job_quantity as quantity, unit_price as actual_price,
        drawing_release as drawing_release_date,
        delivery_required_date
      FROM jobs
      WHERE job_number IS NOT NULL AND job_number != ''
      ORDER BY job_number, line_number
    `).all();
    
    let jobCount = 0;
    let orderItemCount = 0;
    const jobMap = {}; // job_number -> id
    
    // 按 job_number 分组
    const jobGroups = {};
    for (const row of jobsData) {
      if (!jobGroups[row.job_number]) {
        jobGroups[row.job_number] = [];
      }
      jobGroups[row.job_number].push(row);
    }
    
    for (const [jobNumber, items] of Object.entries(jobGroups)) {
      const firstItem = items[0];
      
      // 创建 job 记录
      try {
        const poId = poMap[firstItem.po_number];
        if (!poId) {
          console.warn(`  ⚠ 无法找到 PO: ${firstItem.po_number}，跳过 job: ${jobNumber}`);
          continue;
        }
        
        const stmt = db.prepare(`
          INSERT INTO job (job_number, po_id, priority, created_at, updated_at)
          VALUES (?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
        `);
        const result = stmt.run(jobNumber, poId, 'Normal');
        jobMap[jobNumber] = result.lastInsertRowid;
        jobCount++;
        
        // 为每个 line_number 创建 order_item
        for (const item of items) {
          const partKey = `${item.part_number}|${item.revision || '-'}`;
          const partId = partMap[partKey];
          
          if (!partId) {
            console.warn(`  ⚠ 无法找到零件: ${partKey}，跳过 line_number: ${item.line_number}`);
            continue;
          }
          
          const oiStmt = db.prepare(`
            INSERT INTO order_item (
              job_id, part_id, line_number, quantity, actual_price,
              drawing_release_date, delivery_required_date, status,
              created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 
              datetime('now', 'localtime'), datetime('now', 'localtime'))
          `);
          
          oiStmt.run(
            result.lastInsertRowid,
            partId,
            item.line_number || 0,
            item.quantity || 0,
            item.actual_price || null,
            parseDate(item.drawing_release_date),
            parseDate(item.delivery_required_date)
          );
          orderItemCount++;
        }
      } catch (e) {
        console.warn(`  ⚠ 创建 job 失败: ${jobNumber}`, e.message);
      }
    }
    console.log(`  ✓ 迁移 ${jobCount} 个作业`);
    console.log(`  ✓ 迁移 ${orderItemCount} 个订单明细\n`);

    // ========================================================================
    // 步骤 5: 迁移发货数据
    // ========================================================================
    console.log('步骤 5: 迁移发货数据...');
    
    const shipments = db
      .prepare(`
        SELECT DISTINCT packing_slip, invoice_number, delivery_shipped_date
        FROM jobs
        WHERE packing_slip IS NOT NULL AND packing_slip != ''
      `)
      .all();
    
    let shipmentCount = 0;
    const shipmentMap = {}; // packing_slip -> id
    
    for (const row of shipments) {
      try {
        const stmt = db.prepare(`
          INSERT INTO shipment (packing_slip_number, invoice_number, delivery_shipped_date, created_at, updated_at)
          VALUES (?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
        `);
        const result = stmt.run(row.packing_slip, row.invoice_number || null, parseDate(row.delivery_shipped_date));
        shipmentMap[row.packing_slip] = result.lastInsertRowid;
        shipmentCount++;
      } catch (e) {
        const existingShipment = db
          .prepare(`SELECT id FROM shipment WHERE packing_slip_number = ?`)
          .get(row.packing_slip);
        if (existingShipment) {
          shipmentMap[row.packing_slip] = existingShipment.id;
        }
      }
    }
    console.log(`  ✓ 迁移 ${shipmentCount} 个发货单\n`);

    // ========================================================================
    // 统计迁移结果
    // ========================================================================
    console.log('========================================');
    console.log('✅ 数据迁移完成！');
    console.log('========================================');
    console.log(`总结：`);
    console.log(`  - 客户: ${customerCount} 条`);
    console.log(`  - 采购订单: ${poCount} 条`);
    console.log(`  - 零件: ${partCount} 条`);
    console.log(`  - 作业: ${jobCount} 条`);
    console.log(`  - 订单明细: ${orderItemCount} 条`);
    console.log(`  - 发货单: ${shipmentCount} 条`);
    console.log('========================================\n');

  } catch (error) {
    console.error('迁移失败:', error);
    throw error;
  }
}

export function down(db) {
  // 反向清理 - 删除已迁移的数据
  console.log('清理已迁移的数据...');
  
  const tables = [
    'shipment_item',
    'shipment',
    'order_item',
    'job',
    'purchase_order',
    'part',
    'customer_contact',
    'customer'
  ];

  for (const table of tables) {
    db.prepare(`DELETE FROM ${table}`).run();
    console.log(`✓ 清空表: ${table}`);
  }

  console.log('\n✅ 迁移 022 回滚完成');
}
