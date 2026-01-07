/**
 * 增量扫描程序 - 检测G盘上的文件变化
 * 
 * 功能：
 * 1. 加载上次的扫描结果（历史记录）
 * 2. 执行新的扫描
 * 3. 对比两次扫描结果
 * 4. 检测新增、修改、删除的文件
 * 5. 生成变更记录（delta）
 * 6. 更新数据库
 * 7. 保存新的历史记录
 * 
 * 用法：
 *   node scripts/scan-incremental.js [--drive G:] [--workers 4]
 */

import { spawn } from 'child_process';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 配置对象
 */
const config = {
  drivePath: process.argv.find(arg => arg.startsWith('--drive'))?.split('=')[1] || 'G:',
  workerCount: parseInt(process.argv.find(arg => arg.startsWith('--workers'))?.split('=')[1] || '4'),
  historyPath: 'data/scan-history.json',
  currentScanPath: 'data/scan-results.json',
  deltaPath: 'data/scan-delta.json',
  dbPath: 'data/record.db'
};

/**
 * 加载历史扫描结果
 */
function loadHistoryScan() {
  if (!fs.existsSync(config.currentScanPath)) {
    console.log('⚠️  未找到之前的扫描结果，将执行首次完整扫描');
    return null;
  }

  try {
    const data = JSON.parse(fs.readFileSync(config.currentScanPath, 'utf-8'));
    return data;
  } catch (error) {
    console.error('❌ 加载历史扫描失败:', error.message);
    return null;
  }
}

/**
 * 执行新的扫描 - 简化版本，直接调用scan-g-drive.js
 */
async function executeScan() {
  return new Promise((resolve, reject) => {
    const scanScript = path.join(__dirname, 'scan-g-drive.js');

    console.log('⚙️  执行新的扫描...');

    const node = spawn('node', [
      scanScript,
      `--drive=${config.drivePath}`,
      `--workers=${config.workerCount}`,
      `--output=${config.currentScanPath}`
    ], {
      stdio: ['ignore', 'inherit', 'inherit']
    });

    node.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`扫描失败，退出码: ${code}`));
        return;
      }

      // 加载扫描结果
      try {
        const result = JSON.parse(fs.readFileSync(config.currentScanPath, 'utf-8'));
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });

    node.on('error', reject);
  });
}

/**
 * 对比两次扫描结果，检测变化
 */
function detectChanges(historyScan, currentScan) {
  console.log('🔍 对比扫描结果...');

  // 构建映射表
  const historyMap = new Map();
  if (historyScan) {
    for (const file of historyScan.files) {
      historyMap.set(file.file_path.toLowerCase(), file);
    }
  }

  const currentMap = new Map();
  for (const file of currentScan.files) {
    currentMap.set(file.file_path.toLowerCase(), file);
  }

  // 检测变化
  const delta = {
    added: [],
    modified: [],
    deleted: [],
    unchanged: []
  };

  // 检测新增和修改
  for (const [path, currentFile] of currentMap) {
    const historyFile = historyMap.get(path);

    if (!historyFile) {
      delta.added.push(currentFile);
    } else {
      // 检查是否修改（比较修改时间和大小）
      const modified =
        currentFile.last_modified_utc !== historyFile.last_modified_utc ||
        currentFile.file_size_bytes !== historyFile.file_size_bytes;

      if (modified) {
        delta.modified.push({
          file: currentFile,
          previous_modified: historyFile.last_modified_utc,
          previous_size: historyFile.file_size_bytes
        });
      } else {
        delta.unchanged.push(currentFile);
      }
    }
  }

  // 检测删除
  if (historyScan) {
    for (const [path, historyFile] of historyMap) {
      if (!currentMap.has(path)) {
        delta.deleted.push(historyFile);
      }
    }
  }

  console.log(`  ✓ 新增: ${delta.added.length} 个文件`);
  console.log(`  ✓ 修改: ${delta.modified.length} 个文件`);
  console.log(`  ✓ 删除: ${delta.deleted.length} 个文件`);
  console.log(`  ✓ 未变: ${delta.unchanged.length} 个文件`);

  return delta;
}

/**
 * 更新数据库
 */
function updateDatabase(delta) {
  console.log('💾 更新数据库...');

  const db = new Database(config.dbPath);

  let successCount = 0;
  let errorCount = 0;

  // 插入新增文件
  if (delta.added.length > 0) {
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO drawing_file (
        file_name, file_path, last_modified_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)
    `);

    const insertTx = db.transaction(() => {
      for (const file of delta.added) {
        try {
          insertStmt.run(
            file.file_name,
            file.file_path,
            file.last_modified_utc,
            new Date().toISOString(),
            new Date().toISOString()
          );
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }
    });

    insertTx();
    console.log(`  ✓ 插入: ${successCount} 个新文件`);
  }

  // 更新修改的文件
  if (delta.modified.length > 0) {
    const updateStmt = db.prepare(`
      UPDATE drawing_file 
      SET last_modified_at = ?, updated_at = ?
      WHERE file_path = ?
    `);

    const updateTx = db.transaction(() => {
      for (const item of delta.modified) {
        try {
          updateStmt.run(
            item.file.last_modified_utc,
            new Date().toISOString(),
            item.file.file_path
          );
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }
    });

    updateTx();
    console.log(`  ✓ 更新: ${successCount} 个已修改文件`);
  }

  // 软删除已移除的文件（可选）
  if (delta.deleted.length > 0) {
    const deleteStmt = db.prepare(`
      UPDATE drawing_file 
      SET is_active = 0, updated_at = ?
      WHERE file_path = ?
    `);

    const deleteTx = db.transaction(() => {
      for (const file of delta.deleted) {
        try {
          deleteStmt.run(
            new Date().toISOString(),
            file.file_path
          );
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }
    });

    deleteTx();
    console.log(`  ✓ 标记删除: ${successCount} 个已删除文件`);
  }

  // 数据库最终统计
  const dbCount = db.prepare('SELECT COUNT(*) as cnt FROM drawing_file').get();
  const activeCount = db.prepare('SELECT COUNT(*) as cnt FROM drawing_file WHERE is_active = 1').get();

  console.log(`  💾 数据库总数: ${dbCount.cnt} 条`);
  console.log(`  💾 活跃记录: ${activeCount.cnt} 条`);

  db.close();
}

/**
 * 保存变更记录
 */
function saveDelta(delta, currentScan) {
  const deltaRecord = {
    delta_date: new Date().toISOString(),
    summary: {
      added: delta.added.length,
      modified: delta.modified.length,
      deleted: delta.deleted.length,
      unchanged: delta.unchanged.length
    },
    files: {
      added: delta.added.slice(0, 100),  // 只保存前100条示例
      modified: delta.modified.slice(0, 100),
      deleted: delta.deleted.slice(0, 100)
    }
  };

  fs.writeFileSync(config.deltaPath, JSON.stringify(deltaRecord, null, 2), 'utf-8');
  console.log(`📁 变更记录保存: ${config.deltaPath}`);
}

/**
 * 保存新的历史记录
 */
function saveNewHistory(currentScan) {
  let history = { scans: [] };

  if (fs.existsSync(config.historyPath)) {
    history = JSON.parse(fs.readFileSync(config.historyPath, 'utf-8'));
  }

  history.scans.push({
    scan_date: currentScan.scan_metadata.scan_date,
    file_count: currentScan.files.length,
    timestamp: new Date().toISOString()
  });

  fs.writeFileSync(config.historyPath, JSON.stringify(history, null, 2), 'utf-8');
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('📚 增量扫描程序');
    console.log(`  驱动器: ${config.drivePath}`);
    console.log('');

    // 1. 加载历史扫描
    console.log('📖 加载历史扫描...');
    const historyScan = loadHistoryScan();
    if (historyScan) {
      console.log(`  ✓ 上次扫描: ${historyScan.files.length} 个文件`);
    }
    console.log('');

    // 2. 执行新扫描
    const currentScan = await executeScan();
    console.log(`  ✓ 本次扫描: ${currentScan.files.length} 个文件`);
    console.log('');

    // 3. 对比结果
    const delta = detectChanges(historyScan, currentScan);
    console.log('');

    // 4. 更新数据库
    updateDatabase(delta);
    console.log('');

    // 5. 保存变更记录
    saveDelta(delta, currentScan);

    // 6. 保存历史记录
    saveNewHistory(currentScan);

    console.log('');
    console.log('✅ 增量扫描完成！');
    console.log('');
    console.log('📊 变更统计：');
    console.log(`  • 新增: ${delta.added.length} 个文件`);
    console.log(`  • 修改: ${delta.modified.length} 个文件`);
    console.log(`  • 删除: ${delta.deleted.length} 个文件`);
    console.log(`  • 未变: ${delta.unchanged.length} 个文件`);
    console.log('');
    console.log('✨ 所有更新已完成！');

  } catch (error) {
    console.error('❌ 增量扫描失败:', error.message);
    process.exit(1);
  }
}

main();
