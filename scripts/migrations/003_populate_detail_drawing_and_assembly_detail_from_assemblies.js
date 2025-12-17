/**
 * 迁移: 003_populate_detail_drawing_and_assembly_detail_from_assemblies
 * 从 assemblies 表初始化 detail_drawing 和 assembly_detail 表的数据
 */

export const name = '003_populate_detail_drawing_and_assembly_detail_from_assemblies';

export function up(db) {
  try {
    // 1. 从 assemblies 表获取所有数据并插入 detail_drawing 表
    const assemblies = db.prepare('SELECT DISTINCT drawing_number, description FROM assemblies').all();

    if (assemblies.length === 0) {
      console.log('⊘ assemblies 表为空，跳过数据初始化');
      return;
    }

    const insertDetailDrawing = db.prepare(`
      INSERT OR IGNORE INTO detail_drawing (drawing_number, description, isAssembly)
      VALUES (?, ?, ?)
    `);

    let detailDrawingCount = 0;
    for (const row of assemblies) {
      const isAssembly = row.drawing_number.includes('-GA-') ? 1 : 0;
      const result = insertDetailDrawing.run(row.drawing_number, row.description, isAssembly);
      if (result.changes > 0) {
        detailDrawingCount++;
      }
    }
    console.log(`✓ 插入 ${detailDrawingCount} 条 detail_drawing 记录`);

    // 2. 从 assemblies 表获取所有数据并插入 assembly_detail 表
    const allAssemblies = db.prepare('SELECT part_number, drawing_number, quantity FROM assemblies').all();

    const insertAssemblyDetail = db.prepare(`
      INSERT INTO assembly_detail (part_number, drawing_number, quantity, status, file_location, delivery_required_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    let assemblyDetailCount = 0;
    for (const row of allAssemblies) {
      // 从 jobs 表查询 delivery_required_date
      const jobData = db.prepare(
        'SELECT delivery_required_date FROM jobs WHERE part_number = ? LIMIT 1'
      ).get(row.part_number);
      const deliveryDate = jobData?.delivery_required_date || null;

      // 从 drawings 表查询 file_location
      const drawingData = db.prepare(
        'SELECT file_location FROM drawings WHERE drawing_number = ? LIMIT 1'
      ).get(row.drawing_number);
      const fileLocation = drawingData?.file_location || null;

      insertAssemblyDetail.run(
        row.part_number,
        row.drawing_number,
        row.quantity,
        'N/A',
        fileLocation,
        deliveryDate
      );
      assemblyDetailCount++;
    }
    console.log(`✓ 插入 ${assemblyDetailCount} 条 assembly_detail 记录`);

  } catch (error) {
    console.error('✗ 数据初始化失败:', error.message);
    throw error;
  }
}

export function down(db) {
  db.exec(`DELETE FROM assembly_detail`);
  db.exec(`DELETE FROM detail_drawing`);
  console.log('✓ 清空 detail_drawing 和 assembly_detail 表');
}
