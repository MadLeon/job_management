#!/usr/bin/env node

/**
 * 脚本名称: one-time-changePONumber.js
 * 功能: 将数据库中所有旧格式的NPO号更新为新格式
 * 
 * 旧格式: NPO-{YYYYMMDD}-{公司名}-{序号} (如: NPO-20260131-ABILTD-01)
 * 新格式: NPO-{oe_number}-{job_number}-{line_number} (如: NPO-38848-72326-1)
 * 
 * 处理流程:
 * 1. 找出所有以NPO-开头且符合旧格式的PO
 * 2. 对于每个旧NPO，查找关联的order_item获取oe_number、job_number、line_number
 * 3. 生成新格式的NPO号
 * 4. 检查新NPO是否已存在，如果存在则合并或跳过
 * 5. 更新purchase_order表中的po_number
 * 6. 记录所有变更
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// 配置常量
// ============================================================================

const CONFIG = {
  db_path: path.join(process.cwd(), 'data', 'record.db'),
  log_path: path.join(process.cwd(), 'scripts', 'logs', `po-number-change-${new Date().toISOString().split('T')[0]}.json`),
};

// ============================================================================
// 变更报告类
// ============================================================================

class ChangeReport {
  constructor() {
    this.startTime = new Date();
    this.stats = {
      old_npo_found: 0,
      po_number_changed: 0,
      po_number_skipped: 0,
      po_number_merged: 0,
      errors: [],
    };
    this.changes = [];
    this.skipped = [];
  }

  addChange(data) {
    this.changes.push(data);
    this.stats.po_number_changed++;
  }

  addSkipped(data) {
    this.skipped.push(data);
    this.stats.po_number_skipped++;
  }

  addMerged(data) {
    this.changes.push({ ...data, action: 'merged' });
    this.stats.po_number_merged++;
  }

  addError(msg, error) {
    const fullMsg = `${msg}: ${error.message || error}`;
    this.stats.errors.push(fullMsg);
  }

  print() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 PO号变更报告');
    console.log('='.repeat(80));
    console.log(`⏱️  耗时: ${(new Date() - this.startTime) / 1000}s`);
    console.log(`📈 统计数据:`);
    console.log(`   - 找到旧格式NPO: ${this.stats.old_npo_found}`);
    console.log(`   - 成功变更: ${this.stats.po_number_changed}`);
    console.log(`   - 合并现有PO: ${this.stats.po_number_merged}`);
    console.log(`   - 跳过处理: ${this.stats.po_number_skipped}`);
    console.log(`   - 错误: ${this.stats.errors.length}`);

    if (this.stats.errors.length > 0) {
      console.log(`\n❌ 错误详情:`);
      this.stats.errors.forEach(e => console.log(`   - ${e}`));
    }

    console.log('='.repeat(80) + '\n');
  }

  save() {
    const logsDir = path.dirname(CONFIG.log_path);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const content = JSON.stringify(
      {
        timestamp: this.startTime.toISOString(),
        duration_ms: new Date() - this.startTime,
        stats: this.stats,
        sample_changes: this.changes.slice(0, 20),
        sample_skipped: this.skipped.slice(0, 10),
      },
      null,
      2
    );
    fs.writeFileSync(CONFIG.log_path, content);
    console.log(`\n📄 变更报告已保存至: ${CONFIG.log_path}`);
  }
}

// ============================================================================
// 核心变更函数
// ============================================================================

/**
 * 检测是否是旧格式的NPO号
 * 旧格式: NPO-{YYYYMMDD}-{公司名}-{序号}
 * 如: NPO-20260131-ABILTD-01
 */
function isOldNpoFormat(poNumber) {
  const pattern = /^NPO-\d{8}-[A-Z0-9]+-\d{2}$/;
  return pattern.test(poNumber);
}

/**
 * 变更PO号
 */
function changePONumbers(db) {
  const report = new ChangeReport();

  try {
    // ===== 步骤1: 找出所有旧格式的NPO号 =====
    const findOldNpoQuery = `
      SELECT id, po_number
      FROM purchase_order
      WHERE po_number LIKE 'NPO-%'
      ORDER BY id ASC
    `;

    const allNpos = db.prepare(findOldNpoQuery).all();
    const oldNpos = allNpos.filter(po => isOldNpoFormat(po.po_number));
    report.stats.old_npo_found = oldNpos.length;

    if (oldNpos.length === 0) {
      console.log('✅ 未发现需要变更的旧格式NPO号');
      return report;
    }

    console.log(`🔍 发现 ${oldNpos.length} 个旧格式NPO号\n`);

    // ===== 步骤2: 对每个旧NPO查找关联的order_item，生成新NPO号 =====
    const transaction = db.transaction(() => {
      for (const oldPo of oldNpos) {
        try {
          // 查找该PO关联的order_item信息
          const itemQuery = `
            SELECT 
              purchase_order.oe_number,
              job.job_number,
              order_item.line_number
            FROM order_item
            JOIN job ON order_item.job_id = job.id
            JOIN purchase_order ON job.po_id = purchase_order.id
            WHERE purchase_order.id = ?
            LIMIT 1
          `;

          const itemInfo = db.prepare(itemQuery).get(oldPo.id);

          if (!itemInfo) {
            report.addSkipped({
              old_po_id: oldPo.id,
              old_po_number: oldPo.po_number,
              reason: '找不到关联的order_item',
            });
            console.log(`⊘ ${oldPo.po_number} - 未找到关联的order_item`);
            continue;
          }

          // 生成新PO号
          const newPoNumber = `NPO-${itemInfo.oe_number}-${itemInfo.job_number}-${itemInfo.line_number}`;

          // 检查新PO号是否已存在
          const existingPoQuery = `SELECT id FROM purchase_order WHERE po_number = ?`;
          const existingPo = db.prepare(existingPoQuery).get(newPoNumber);

          if (existingPo) {
            if (existingPo.id === oldPo.id) {
              // 同一条记录，已经是新格式，跳过
              report.addSkipped({
                old_po_id: oldPo.id,
                old_po_number: oldPo.po_number,
                new_po_number: newPoNumber,
                reason: '已是新格式',
              });
              console.log(`⊘ ${oldPo.po_number} → ${newPoNumber} (已是新格式)`);
              continue;
            } else {
              // 新PO号已存在（来自另一条记录）
              // 选择保留现有的，把旧记录标记为is_active=0
              const deactivateQuery = `
                UPDATE purchase_order
                SET is_active = 0, updated_at = datetime('now', 'localtime')
                WHERE id = ?
              `;
              db.prepare(deactivateQuery).run(oldPo.id);
              report.addMerged({
                old_po_id: oldPo.id,
                old_po_number: oldPo.po_number,
                new_po_number: newPoNumber,
                existing_po_id: existingPo.id,
                action: 'deactivated_old_po',
              });
              console.log(`→ ${oldPo.po_number} → ${newPoNumber} (保留现有PO，旧记录标记为inactive)`);
              continue;
            }
          }

          // 更新PO号
          const updateQuery = `
            UPDATE purchase_order
            SET po_number = ?, updated_at = datetime('now', 'localtime')
            WHERE id = ?
          `;
          const updateResult = db.prepare(updateQuery).run(newPoNumber, oldPo.id);

          if (updateResult.changes > 0) {
            report.addChange({
              po_id: oldPo.id,
              old_po_number: oldPo.po_number,
              new_po_number: newPoNumber,
              oe_number: itemInfo.oe_number,
              job_number: itemInfo.job_number,
              line_number: itemInfo.line_number,
            });
            console.log(`✓ ${oldPo.po_number} → ${newPoNumber}`);
          }
        } catch (error) {
          report.addError(`处理PO ${oldPo.po_number}`, error);
          console.error(`✗ ${oldPo.po_number} - ${error.message}`);
        }
      }
    });

    transaction();

    report.print();
    report.save();

    return report;

  } catch (error) {
    console.error('❌ 变更失败:', error.message);
    report.addError('变更过程', error);
    report.print();
    report.save();
    throw error;
  }
}

// ============================================================================
// 入口点
// ============================================================================

async function main() {
  console.log('🚀 开始变更PO号（旧格式 → 新格式）');
  console.log(`📁 数据库: ${CONFIG.db_path}\n`);

  let db;

  try {
    db = new Database(CONFIG.db_path);
    db.pragma('foreign_keys = ON');

    console.log('✓ 数据库连接成功\n');

    // 执行变更
    const report = changePONumbers(db);

    if (report.stats.errors.length > 0) {
      console.log('⚠️  变更过程中遇到错误，请检查日志');
      process.exit(1);
    }

    console.log('✅ PO号变更完成！');

  } catch (error) {
    console.error('致命错误:', error.message);
    process.exit(1);
  } finally {
    if (db) {
      db.close();
      console.log('✓ 数据库连接已关闭');
    }
  }
}

main();
