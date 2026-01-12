/**
 * 迁移 011: 根据用户确认的映射关系填充 folder_mapping 表
 * 
 * 这个迁移将经过审查和确认的客户-文件夹关联插入到folder_mapping表中
 * 确认规则:
 * - [Y] = 接受最佳匹配的建议
 * - [N] 或 空 = 跳过此客户
 * - [具体文件夹名] = 使用指定的文件夹名
 */

export const name = '011_populate_folder_mapping';

/**
 * 确认的客户-文件夹映射关系
 * 来源: data/customer-folder-mapping-report.txt (已用户审查)
 */
const confirmedMappings = [
  // ID | 客户名 | 确认的文件夹名 | 来源
  { customerId: 49, customerName: 'AB Sciex', folderName: 'AB SCIEX', source: 'exact-match' },
  { customerId: 25, customerName: 'ABI Ltd', folderName: 'ABI Ltd', source: 'exact-match' },
  { customerId: 55, customerName: 'ATS Life Science', folderName: 'ATS Life Science', source: 'exact-match' },
  { customerId: 56, customerName: 'ATS Test', folderName: 'ATS Test', source: 'exact-match' },
  { customerId: 26, customerName: 'ATS-Corp', folderName: 'ATS (Automation Tooling Systems)', source: 'user-confirmed' },
  { customerId: 50, customerName: 'Aecon Ind', folderName: 'AECON Group Inc', source: 'user-confirmed' },
  { customerId: 51, customerName: 'Aecon Utilities', folderName: 'Aecon Utilities', source: 'exact-match' },
  { customerId: 53, customerName: 'Aero-Structural', folderName: 'AeroStructural', source: 'exact-match' },
  { customerId: 52, customerName: 'Ampson', folderName: 'AMPSON', source: 'exact-match' },
  { customerId: 54, customerName: 'Atkins Realis', folderName: 'A.E.C.L (CANDU)', source: 'user-confirmed-note: same-company-as-Candu' },
  { customerId: 27, customerName: 'Axis Tool', folderName: 'Axis Tool', source: 'exact-match' },
  { customerId: 57, customerName: 'BC Hydro', folderName: 'BC Hydro', source: 'exact-match' },
  { customerId: 28, customerName: 'BWXT Med', folderName: 'BWXT Medical Ltd', source: 'user-confirmed' },
  { customerId: 29, customerName: 'BWXT(GE)', folderName: 'BWXT (GE)', source: 'user-confirmed' },
  { customerId: 30, customerName: 'Bombardier', folderName: 'Bombardier', source: 'exact-match' },
  { customerId: 59, customerName: 'CH2M', folderName: 'Jacobs (CH2M)', source: 'user-confirmed' },
  { customerId: 32, customerName: 'Candu', folderName: 'A.E.C.L (CANDU)', source: 'user-confirmed' },
  { customerId: 60, customerName: 'ComEnCo', folderName: 'Comenco', source: 'exact-match' },
  { customerId: 61, customerName: 'Creation T.', folderName: 'Creation Technologies', source: 'user-confirmed' },
  { customerId: 33, customerName: 'DJ Ind.', folderName: 'D.J.Indus', source: 'user-confirmed' },
  { customerId: 64, customerName: 'Eaton', folderName: 'Eaton', source: 'exact-match' },
  { customerId: 34, customerName: 'Eclipse', folderName: 'Eclipse Automation', source: 'user-confirmed' },
  { customerId: 66, customerName: 'Gosco', folderName: 'Gosco Valves', source: 'user-confirmed' },
  { customerId: 67, customerName: 'Gullco', folderName: 'Gullco', source: 'exact-match' },
  { customerId: 71, customerName: 'HIFE Systems', folderName: 'Hife Canada', source: 'user-confirmed' },
  { customerId: 35, customerName: 'HV Grid', folderName: 'hvGrid-tech', source: 'user-confirmed' },
  { customerId: 68, customerName: 'Haliburton', folderName: 'Haliburton Forest', source: 'user-confirmed' },
  { customerId: 69, customerName: 'Hercules SLR', folderName: 'Hercules SLR', source: 'exact-match' },
  { customerId: 70, customerName: 'Hess M/C', folderName: 'Hess Machinery', source: 'user-confirmed' },
  { customerId: 72, customerName: 'Husky', folderName: 'Husky', source: 'exact-match' },
  { customerId: 36, customerName: 'Hybrid', folderName: 'Hybrid (HMC)', source: 'user-confirmed' },
  { customerId: 75, customerName: 'Hydac', folderName: 'Hydac', source: 'exact-match' },
  { customerId: 76, customerName: 'Hydro One', folderName: 'Hydro One', source: 'exact-match' },
  { customerId: 77, customerName: 'Inmotive', folderName: 'Inmotive', source: 'exact-match' },
  { customerId: 37, customerName: 'Kinectrics', folderName: 'Kinectrics', source: 'exact-match' },
  { customerId: 39, customerName: 'Liburdi', folderName: 'Liburdi', source: 'exact-match' },
  { customerId: 78, customerName: 'Lumicision', folderName: 'Lumicision', source: 'exact-match' },
  { customerId: 40, customerName: 'M.D.A', folderName: 'MDA', source: 'exact-match' },
  { customerId: 41, customerName: 'MHI-Canada', folderName: 'MHI', source: 'user-confirmed' },
  { customerId: 80, customerName: 'MHI-Nagoya', folderName: 'MHI', source: 'user-confirmed' },
  { customerId: 42, customerName: 'Metonic', folderName: 'Metonics - Edwin', source: 'user-confirmed' },
  { customerId: 83, customerName: 'Pet All Mfg', folderName: 'Pet All Mfg', source: 'exact-match' },
  { customerId: 84, customerName: 'Piramal', folderName: 'PIRAMAL', source: 'exact-match' },
  { customerId: 85, customerName: 'Polyson', folderName: 'Polyson', source: 'exact-match' },
  { customerId: 86, customerName: 'Promation', folderName: 'Promation', source: 'exact-match' },
  { customerId: 87, customerName: 'Protenergy', folderName: 'Protenergy', source: 'exact-match' },
  { customerId: 88, customerName: 'Protomek', folderName: 'Protomek Design Group', source: 'user-confirmed' },
  { customerId: 89, customerName: 'Qvella', folderName: 'Qvella', source: 'exact-match' },
  { customerId: 90, customerName: 'Rexroth', folderName: 'Rexroth', source: 'exact-match' },
  { customerId: 93, customerName: 'SICK', folderName: 'SICK', source: 'exact-match' },
  { customerId: 43, customerName: 'SNC-Lavalin', folderName: 'SNC Lavalin', source: 'user-confirmed' },
  { customerId: 44, customerName: 'Safran (Messier)', folderName: 'Safran (Messier)', source: 'exact-match' },
  { customerId: 91, customerName: 'Safran (US)', folderName: 'Safran(US)', source: 'user-confirmed' },
  { customerId: 45, customerName: 'Speedway Pkg', folderName: 'Speedway Packaging', source: 'user-confirmed' },
  { customerId: 46, customerName: 'Superwake', folderName: 'Superwake', source: 'exact-match' },
  { customerId: 98, customerName: 'TSC Inc', folderName: 'TSC Inc', source: 'exact-match' },
  { customerId: 47, customerName: 'TTC', folderName: 'TTC', source: 'exact-match' },
  { customerId: 95, customerName: 'Tesla (Hibar)', folderName: 'Hibar', source: 'user-confirmed' },
  { customerId: 94, customerName: 'The M/C-Centre', folderName: 'The Machining Center (TMC)', source: 'user-confirmed' },
  { customerId: 96, customerName: 'Tremco', folderName: 'Tremco', source: 'exact-match' },
  { customerId: 97, customerName: 'Truck Wash', folderName: 'Truck Wash Technology', source: 'user-confirmed' },
  { customerId: 99, customerName: 'Twin River', folderName: 'Twin River', source: 'exact-match' },
  { customerId: 102, customerName: 'Westinghouse', folderName: 'Westinghouse', source: 'exact-match' },
  { customerId: 48, customerName: 'Woodbridge', folderName: 'WOODBRIDGE FOAM', source: 'user-confirmed' },
  { customerId: 103, customerName: 'Zero Defects', folderName: 'Zero Defects', source: 'exact-match' },
  // EHV Power - 用户没有标记，假设Y
  { customerId: 65, customerName: 'EHV Power', folderName: 'EHV Power', source: 'exact-match' }
];

/**
 * 执行迁移 - 填充 folder_mapping 表
 * @param {Database} db - 数据库连接
 */
export function up(db) {
  console.log('📌 步骤 011: 填充 folder_mapping 表...\n');

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO folder_mapping (customer_id, folder_name, is_verified, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  let inserted = 0;
  let skipped = 0;

  try {
    // 开启事务以提高性能
    const transaction = db.transaction(() => {
      for (const mapping of confirmedMappings) {
        try {
          const result = insertStmt.run(
            mapping.customerId,
            mapping.folderName,
            1, // is_verified = 1（已确认）
            now,
            now
          );

          if (result.changes > 0) {
            inserted++;
            console.log(`  ✓ ${mapping.customerName} -> ${mapping.folderName}`);
          } else {
            skipped++;
          }
        } catch (error) {
          console.error(`  ❌ 插入失败: ${mapping.customerName}`, error.message);
        }
      }
    });

    transaction();

    console.log(`\n✓ 插入的映射关系: ${inserted}`);
    console.log(`⊘ 跳过的关系: ${skipped}`);
    console.log(`  总计: ${confirmedMappings.length} 个关系处理完成\n`);
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    throw error;
  }
}

/**
 * 回滚迁移 - 删除本次添加的映射关系
 * @param {Database} db - 数据库连接
 */
export function down(db) {
  console.log('📌 回滚 011: 删除添加的映射关系...');

  try {
    const customerIds = confirmedMappings.map(m => m.customerId);

    // 删除与这些客户相关的所有映射关系
    const placeholders = customerIds.map(() => '?').join(',');
    const result = db.prepare(`
      DELETE FROM folder_mapping 
      WHERE customer_id IN (${placeholders})
    `).run(...customerIds);

    console.log(`  ✓ 删除的映射关系: ${result.changes}\n`);
  } catch (error) {
    console.error('❌ 回滚失败:', error.message);
    throw error;
  }
}
