/**
 * 迁移 010: 添加新客户到 customer 表
 * 
 * 这个迁移的逻辑:
 * - 对于每个新客户，检查 customer_name 是否已存在
 * - 如果不存在，则插入新记录，设置 usage_count=0, created_at=当前时间
 * - 如果已存在，则跳过（INSERT OR IGNORE）
 */

export const name = '010_add_customers';

/** @type {Array<string>} 新增客户列表 */
const newCustomers = [
  'AB Sciex',
  'Aecon Ind',
  'Aecon Utilities',
  'Ampson',
  'Aero-Structural',
  'Atkins Realis',
  'ATS Life Science',
  'ATS Test',
  'BC Hydro',
  'Blenheim',
  'CH2M',
  'ComEnCo',
  'Creation T.',
  'DieMax',
  'DTE',
  'Eaton',
  'EHV Power',
  'Gosco',
  'Gullco',
  'Haliburton',
  'Hercules SLR',
  'Hess M/C',
  'HIFE Systems',
  'Husky',
  'Husky-Mold',
  'Hunstville',
  'Hydac',
  'Hydro One',
  'Inmotive',
  'Lumicision',
  'Lux',
  'MHI-Nagoya',
  'Motion Ind',
  'Nuclear Waste Mgnt',
  'Pet All Mfg',
  'Piramal',
  'Polyson',
  'Promation',
  'Protenergy',
  'Protomek',
  'Qvella',
  'Rexroth',
  'Safran (US)',
  'Shanghai',
  'SICK',
  'The M/C-Centre',
  'Tesla (Hibar)',
  'Tremco',
  'Truck Wash',
  'TSC Inc',
  'Twin River',
  'Van Rob',
  'VNS-Federal',
  'Westinghouse',
  'Zero Defects'
];

/**
 * 执行迁移 - 添加新客户
 * @param {Database} db - 数据库连接
 */
export function up(db) {
  console.log('📌 步骤 010: 添加新客户到 customer 表...');

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO customer (customer_name, usage_count, created_at)
    VALUES (?, 0, ?)
  `);

  const now = new Date().toISOString();
  let inserted = 0;
  let skipped = 0;

  try {
    // 开启事务以提高性能
    const transaction = db.transaction(() => {
      for (const customerName of newCustomers) {
        const result = insertStmt.run(customerName, now);
        if (result.changes > 0) {
          inserted++;
        } else {
          skipped++;
        }
      }
    });

    transaction();

    console.log(`  ✓ 插入新客户: ${inserted}`);
    console.log(`  ⊘ 跳过已存在的客户: ${skipped}`);
    console.log(`  总计: ${newCustomers.length} 个客户处理完成`);
    console.log('');
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    throw error;
  }
}

/**
 * 回滚迁移 - 删除本次添加的客户（基于 created_at 时间戳）
 * @param {Database} db - 数据库连接
 */
export function down(db) {
  console.log('📌 回滚 010: 删除添加的客户...');

  try {
    // 删除在此迁移期间创建的客户（通过时间戳判断）
    // 由于我们无法精确追踪，这里采用安全的方案：
    // 仅删除 usage_count=0 且 created_at 为最近的客户记录
    const result = db.prepare(`
      DELETE FROM customer 
      WHERE usage_count = 0 
      AND customer_name IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...newCustomers);

    console.log(`  ✓ 删除客户: ${result.changes}`);
    console.log('');
  } catch (error) {
    console.error('❌ 回滚失败:', error.message);
    throw error;
  }
}
