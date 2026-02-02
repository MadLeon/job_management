#!/usr/bin/env node

/**
 * 正常PO号规范化脚本
 * 功能：
 * 1. 移除PO号中的空格
 * 2. 转换为大写字母
 * 3. 保留必要的特殊字符（如 . - 等）
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(__dirname);
const dbPath = path.join(projectRoot, 'data', 'record.db');

const db = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

/**
 * 规范化PO号
 */
function normalizePo(poNumber) {
  // 步骤1: 移除所有空格
  let normalized = poNumber.replace(/\s+/g, '');
  
  // 步骤2: 转换为大写字母
  normalized = normalized.toUpperCase();
  
  // 步骤3: 将 REV. 简化为 R.
  normalized = normalized.replace(/REV\./g, 'R.');
  
  // 步骤4: 确保 R. 前有 - (如果R.前面是字母或数字但没有-)
  normalized = normalized.replace(/([A-Z0-9])R\./g, '$1-R.');
  
  // 步骤5: 将 -RN 改为 -R.N (仅当N是单个数字时，如 -R1 → -R.1)
  // 使用负向前瞻 (?!\d) 确保只匹配1位数字，不会误改 -R020 这样的3位数字
  normalized = normalized.replace(/-R(\d)(?!\d)/g, '-R.$1');
  
  // 步骤6: 去掉 R.0N 中的前导零 (R.07 → R.7)
  normalized = normalized.replace(/R\.0(\d)/g, 'R.$1');
  
  // 步骤7: 确保 - 后面没有空格
  normalized = normalized.replace(/\s*-\s*/g, '-');
  
  return normalized;
}

/**
 * 主修复函数
 */
function normalizePOs() {
  console.log('\n🔧 正常PO号规范化\n');
  console.log('='.repeat(60));

  const report = {
    timestamp: new Date().toISOString(),
    normalized: [],
    unchanged: [],
    errors: []
  };

  try {
    // 开始事务
    const beginTx = db.prepare('BEGIN IMMEDIATE');
    beginTx.run();
    console.log('✓ 开始事务\n');

    // 获取所有非NPO的PO号
    const allPos = db.prepare(`
      SELECT id, po_number
      FROM purchase_order
      WHERE po_number NOT LIKE 'NPO-%'
      ORDER BY po_number
    `).all();

    if (allPos.length === 0) {
      console.log('未找到需要规范化的PO');
      db.prepare('COMMIT').run();
      return report;
    }

    console.log(`找到 ${allPos.length} 条真实客户PO\n`);

    const updatePo = db.prepare(`
      UPDATE purchase_order
      SET po_number = ?
      WHERE id = ?
    `);

    let normalizedCount = 0;

    // 处理每个PO
    allPos.forEach(po => {
      const normalized = normalizePo(po.po_number);

      if (normalized !== po.po_number) {
        // 检查规范化后是否会与其他PO重复
        const existing = db.prepare(
          'SELECT id FROM purchase_order WHERE po_number = ? AND id != ?'
        ).get(normalized, po.id);

        if (existing) {
          console.log(`  ⚠️  规范化会产生重复: "${po.po_number}" → "${normalized}" (已存在 id=${existing.id})`);
          report.errors.push(`规范化重复: "${po.po_number}" → "${normalized}"`);
        } else {
          // 执行更新
          updatePo.run(normalized, po.id);
          normalizedCount++;

          report.normalized.push({
            id: po.id,
            oldPoNumber: po.po_number,
            newPoNumber: normalized
          });

          console.log(`  ✓ "${po.po_number}" → "${normalized}"`);
        }
      } else {
        report.unchanged.push({
          id: po.id,
          poNumber: po.po_number
        });
      }
    });

    // 验证规范化结果
    console.log('\n【验证规范化结果】\n');

    // 检查1: 无重复po_number
    const duplicates = db.prepare(`
      SELECT po_number, COUNT(*) as cnt
      FROM purchase_order
      WHERE po_number IS NOT NULL
      GROUP BY po_number
      HAVING cnt > 1
    `).all();

    if (duplicates.length > 0) {
      console.log(`  ❌ 发现${duplicates.length}个重复po_number`);
      duplicates.forEach(d => {
        console.log(`    "${d.po_number}": ${d.cnt}条`);
      });
      throw new Error('规范化产生了重复po_number');
    } else {
      console.log(`  ✓ 无重复po_number`);
    }

    // 检查2: 非NPO的PO中无小写字母
    const lowercasePos = db.prepare(`
      SELECT COUNT(*) as cnt FROM purchase_order
      WHERE po_number NOT LIKE 'NPO-%' AND po_number GLOB '*[a-z]*'
    `).get();

    if (lowercasePos.cnt > 0) {
      console.log(`  ❌ 仍有${lowercasePos.cnt}个PO含有小写字母`);
      throw new Error('规范化失败：仍有小写字母');
    } else {
      console.log(`  ✓ 无小写字母`);
    }

    // 检查3: 验证规范化后的格式
    const invalidFormat = db.prepare(`
      SELECT COUNT(*) as cnt FROM purchase_order
      WHERE po_number NOT LIKE 'NPO-%' AND po_number LIKE '% %'
    `).get();

    if (invalidFormat.cnt > 0) {
      console.log(`  ❌ 仍有${invalidFormat.cnt}个PO含有空格`);
      throw new Error('规范化失败：仍有空格');
    } else {
      console.log(`  ✓ 无多余空格`);
    }

    // 提交事务
    const commitTx = db.prepare('COMMIT');
    commitTx.run();
    console.log('\n✓ 事务已提交\n');

    // 生成报告
    generateReport(report, normalizedCount);

    return report;
  } catch (error) {
    console.error('\n❌ 规范化失败，回滚事务');
    console.error('错误:', error.message);

    const rollbackTx = db.prepare('ROLLBACK');
    rollbackTx.run();

    report.errors.push(error.message);
    return report;
  }
}

/**
 * 生成报告
 */
function generateReport(report, normalizedCount) {
  console.log('='.repeat(60));
  console.log('📊 规范化报告\n');

  console.log('【规范化统计】');
  console.log(`  规范化的PO: ${report.normalized.length}条`);
  console.log(`  无需更改的PO: ${report.unchanged.length}条`);

  if (report.errors.length > 0) {
    console.log(`  错误: ${report.errors.length}条`);
    report.errors.forEach(err => {
      console.log(`    - ${err}`);
    });
  }

  if (report.normalized.length > 0) {
    console.log('\n【规范化详情】');
    report.normalized.slice(0, 10).forEach(item => {
      console.log(`  "${item.oldPoNumber}" → "${item.newPoNumber}"`);
    });
    if (report.normalized.length > 10) {
      console.log(`  ... 还有 ${report.normalized.length - 10} 条`);
    }
  }

  // 最终统计
  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM purchase_order) as total_pos,
      (SELECT COUNT(*) FROM purchase_order WHERE po_number LIKE 'NPO-%') as npo_count,
      (SELECT COUNT(*) FROM purchase_order WHERE po_number NOT LIKE 'NPO-%') as real_po_count
  `).get();

  console.log('\n【数据库统计】');
  console.log(`  总PO数: ${stats.total_pos}条`);
  console.log(`  NPO数: ${stats.npo_count}条`);
  console.log(`  真实客户PO: ${stats.real_po_count}条`);

  console.log('\n' + '='.repeat(60));
  
  if (report.errors.length === 0) {
    console.log(`✅ 规范化完成！\n`);
  } else {
    console.log(`⚠️  规范化完成但存在错误\n`);
  }
}

// 运行修复
const result = normalizePOs();

db.close();

// 如果有错误，退出为1
if (result.errors.length > 0) {
  process.exit(1);
}
