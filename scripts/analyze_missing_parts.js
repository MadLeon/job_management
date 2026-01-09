#!/usr/bin/env node

/**
 * 分析 assemblies 表中缺失的零件
 * 输出需要导入到 part 表的零件列表
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = process.cwd();

const oldDb = new Database(path.join(projectRoot, 'data', 'jobs.db'), { readonly: true });
const newDb = new Database(path.join(projectRoot, 'data', 'record.db'), { readonly: true });

console.log('\n📊 开始分析缺失零件...\n');

try {
  // ============================================================
  // 加载 part 表现有数据
  // ============================================================
  const existingParts = new Set();
  newDb.prepare('SELECT drawing_number FROM part')
    .all()
    .forEach(row => {
      existingParts.add(row.drawing_number);
    });

  console.log(`✅ 加载了 ${existingParts.size} 条现有 part 记录\n`);

  // ============================================================
  // 从 assemblies 中提取所有唯一的零件号
  // ============================================================
  console.log('═'.repeat(60));
  console.log('【1】从 assemblies 提取零件号');
  console.log('═'.repeat(60));

  const allPartNumbers = new Set();
  const allDrawingNumbers = new Set();

  oldDb.prepare("SELECT DISTINCT part_number FROM assemblies WHERE part_number IS NOT NULL AND part_number != ''")
    .all()
    .forEach(row => {
      allPartNumbers.add(row.part_number);
    });

  oldDb.prepare("SELECT DISTINCT drawing_number FROM assemblies WHERE drawing_number IS NOT NULL AND drawing_number != ''")
    .all()
    .forEach(row => {
      allDrawingNumbers.add(row.drawing_number);
    });

  console.log(`\n- 唯一 part_number: ${allPartNumbers.size} 个`);
  console.log(`- 唯一 drawing_number: ${allDrawingNumbers.size} 个`);

  // ============================================================
  // 分析缺失的 part_number
  // ============================================================
  console.log('\n' + '═'.repeat(60));
  console.log('【2】缺失的 part_number 分析');
  console.log('═'.repeat(60));

  const missingPartNumbers = Array.from(allPartNumbers).filter(pn => !existingParts.has(pn));

  console.log(`\n- 现有 part_number: ${allPartNumbers.size - missingPartNumbers.size} 个`);
  console.log(`- 缺失 part_number: ${missingPartNumbers.length} 个`);
  console.log(`- 缺失占比: ${((missingPartNumbers.length / allPartNumbers.size) * 100).toFixed(2)}%`);

  if (missingPartNumbers.length > 0) {
    console.log('\n缺失的 part_number 列表:');
    missingPartNumbers.slice(0, 20).forEach(pn => {
      const cnt = oldDb.prepare('SELECT COUNT(*) as cnt FROM assemblies WHERE part_number = ?').get(pn).cnt;
      console.log(`  - ${pn}: ${cnt} 条记录`);
    });
    if (missingPartNumbers.length > 20) {
      console.log(`  ... 以及其他 ${missingPartNumbers.length - 20} 个`);
    }
  }

  // ============================================================
  // 分析缺失的 drawing_number
  // ============================================================
  console.log('\n' + '═'.repeat(60));
  console.log('【3】缺失的 drawing_number 分析');
  console.log('═'.repeat(60));

  const missingDrawingNumbers = Array.from(allDrawingNumbers).filter(dn => !existingParts.has(dn));

  console.log(`\n- 现有 drawing_number: ${allDrawingNumbers.size - missingDrawingNumbers.length} 个`);
  console.log(`- 缺失 drawing_number: ${missingDrawingNumbers.length} 个`);
  console.log(`- 缺失占比: ${((missingDrawingNumbers.length / allDrawingNumbers.size) * 100).toFixed(2)}%`);

  if (missingDrawingNumbers.length > 0) {
    // 分类统计（含 -GA- 和不含 -GA-）
    const withGA = missingDrawingNumbers.filter(dn => dn.includes('-GA-'));
    const withoutGA = missingDrawingNumbers.filter(dn => !dn.includes('-GA-'));

    console.log(`\n含 -GA- (will be is_assembly=1): ${withGA.length} 个`);
    console.log(`不含 -GA- (will be is_assembly=0): ${withoutGA.length} 个`);

    console.log('\n缺失的 drawing_number 样本 (前20个):');
    missingDrawingNumbers.slice(0, 20).forEach(dn => {
      const cnt = oldDb.prepare('SELECT COUNT(*) as cnt FROM assemblies WHERE drawing_number = ?').get(dn).cnt;
      const hasGA = dn.includes('-GA-') ? '✓' : '✗';
      console.log(`  - ${dn} [GA:${hasGA}]: ${cnt} 条记录`);
    });
    if (missingDrawingNumbers.length > 20) {
      console.log(`  ... 以及其他 ${missingDrawingNumbers.length - 20} 个`);
    }
  }

  // ============================================================
  // 统计需要插入的总记录数
  // ============================================================
  console.log('\n' + '═'.repeat(60));
  console.log('【4】导入统计');
  console.log('═'.repeat(60));

  const totalToImport = missingPartNumbers.length + missingDrawingNumbers.length;
  console.log(`\n- 需导入的 part_number: ${missingPartNumbers.length} 条`);
  console.log(`- 需导入的 drawing_number: ${missingDrawingNumbers.length} 条`);
  console.log(`- 总计: ${totalToImport} 条新零件`);

  // ============================================================
  // 预期结果
  // ============================================================
  console.log('\n' + '═'.repeat(60));
  console.log('【5】导入后预期结果');
  console.log('═'.repeat(60));

  console.log(`\npart 表预期行数: ${existingParts.size} + ${totalToImport} = ${existingParts.size + totalToImport}`);

  // 检查可能的重复（如果某个 drawing_number 既是 part_number 又是 drawing_number）
  const overlap = Array.from(allPartNumbers).filter(pn => allDrawingNumbers.has(pn) && missingPartNumbers.includes(pn));
  if (overlap.length > 0) {
    console.log(`\n⚠️  注意: ${overlap.length} 个零件既是 part_number 又是 drawing_number`);
    console.log('  这些需要特别处理，确保不重复插入');
    overlap.slice(0, 5).forEach(item => {
      console.log(`    - ${item}`);
    });
  }

  // ============================================================
  // 关键数据用于迁移脚本
  // ============================================================
  console.log('\n' + '═'.repeat(60));
  console.log('【6】关键数据总结');
  console.log('═'.repeat(60));

  console.log(`\n1. 需要处理的零件总数: ${totalToImport}`);
  console.log(`2. drawing_number 中含 -GA-: ${missingDrawingNumbers.filter(dn => dn.includes('-GA-')).length} 个`);
  console.log(`3. drawing_number 中不含 -GA-: ${missingDrawingNumbers.filter(dn => !dn.includes('-GA-')).length} 个`);
  console.log(`4. 完成后 part 表记录数: ${existingParts.size + totalToImport}`);

} catch (error) {
  console.error('❌ 分析失败:', error.message);
  process.exit(1);
} finally {
  oldDb.close();
  newDb.close();
  console.log('\n');
}
