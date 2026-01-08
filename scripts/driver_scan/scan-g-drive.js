/**
 * G盘多线程递归扫描程序 - 主协调程序
 * 
 * 功能：
 * 1. 支持测试模式和全量扫描
 * 2. 智能分配worker，根据目录大小调整
 * 3. 递归扫描所有子目录
 * 4. 合并并输出最终JSON文件
 * 5. 计时和性能统计
 * 
 * 用法：
 *   node scripts/scan-g-drive.js --test-dir "WOODBRIDGE FOAM"    # 测试模式
 *   node scripts/scan-g-drive.js                                  # 全量扫描
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 配置对象
 */
const config = {
  drivePath: 'G:\\',
  testDir: (() => {
    // 支持 --test-dir="value" 和 --test-dir "value" 两种格式
    const withEqual = process.argv.find(arg => arg.startsWith('--test-dir='))?.split('=')[1];
    if (withEqual) return withEqual;

    const idx = process.argv.indexOf('--test-dir');
    if (idx !== -1 && idx + 1 < process.argv.length) {
      return process.argv[idx + 1];
    }
    return null;
  })(),
  workerCount: parseInt(process.argv.find(arg => arg.startsWith('--workers'))?.split('=')[1] || '4'),
  outputPath: process.argv.find(arg => arg.startsWith('--output'))?.split('=')[1] || 'data/scan-results.json',
  timeout: 600000, // 10分钟超时
};

/**
 * 目录大小权重配置（根据预期文件数量）
 */
const dirWeights = {
  'CANDU': 3,              // 最大，分配3个worker
  'ATS AUTOMATION': 2,     // 中等，分配2个worker
  'KINECTRICS': 2,         // 中等，分配2个worker
  'WOODBRIDGE FOAM': 1,    // 默认1个worker
};

/**
 * 根据目录大小估算和分配worker数量
 */
function allocateWorkers(directories) {
  const allocations = [];

  for (const dir of directories) {
    const dirName = path.basename(dir);
    const weight = dirWeights[dirName] || 1;
    allocations.push({
      dir: dir,
      dirName: dirName,
      weight: weight,
      workerId: null  // 待分配
    });
  }

  // 按权重分配worker
  let workerPool = [];
  for (let i = 1; i <= config.workerCount; i++) {
    workerPool.push(i);
  }

  let workerIndex = 0;
  for (const alloc of allocations) {
    const workersForThis = Math.max(1, Math.floor((alloc.weight / 3) * config.workerCount));
    alloc.assignedWorkers = [];
    for (let i = 0; i < workersForThis && workerIndex < workerPool.length; i++) {
      alloc.assignedWorkers.push(workerPool[workerIndex]);
      workerIndex++;
    }
    if (alloc.assignedWorkers.length === 0) {
      alloc.assignedWorkers.push(workerPool[workerIndex % workerPool.length]);
    }
  }

  return allocations;
}

/**
 * 启动单个worker扫描
 */
function spawnWorker(workerId, targetDir) {
  return new Promise((resolve, reject) => {
    const psScript = path.join(__dirname, 'scan-g-drive-worker.ps1');

    if (!fs.existsSync(psScript)) {
      reject(new Error(`PowerShell脚本不存在: ${psScript}`));
      return;
    }

    console.log(`  [Worker ${workerId}] 扫描: ${targetDir}`);

    const ps = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', psScript,
      '-TargetDir', targetDir,
      '-AsJson'
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf-8',
      timeout: config.timeout
    });

    let output = '';
    let errorOutput = '';
    let fileCount = 0;

    ps.stdout.on('data', (data) => {
      output += data.toString();
      // 计算输出的JSON行数（粗略估计）
      fileCount += (data.toString().match(/\n/g) || []).length;
    });

    ps.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ps.on('close', (code) => {
      if (code !== 0) {
        console.error(`  [Worker ${workerId}] ❌ PowerShell进程异常 (code: ${code})`);
        if (errorOutput) {
          console.error(`    错误: ${errorOutput.substring(0, 100)}`);
        }
        reject(new Error(`Worker ${workerId} failed with code ${code}`));
        return;
      }

      // 解析输出
      const lines = output.trim().split('\n').filter(l => l.trim());
      const files = [];

      for (const line of lines) {
        try {
          const fileObj = JSON.parse(line);
          files.push(fileObj);
        } catch (e) {
          // 非JSON行，跳过
        }
      }

      console.log(`  [Worker ${workerId}] ✓ 发现 ${files.length} 个文件`);
      resolve(files);
    });

    ps.on('error', (error) => {
      console.error(`  [Worker ${workerId}] ❌ 启动失败: ${error.message}`);
      reject(error);
    });

    // 超时处理
    setTimeout(() => {
      if (!ps.killed) {
        ps.kill('SIGTERM');
        reject(new Error(`Worker ${workerId} timeout`));
      }
    }, config.timeout);
  });
}

/**
 * 主扫描函数
 */
async function scanDrive() {
  const isTestMode = !!config.testDir;
  const modeLabel = isTestMode ? '测试' : '全量';

  console.log(`📚 G盘${modeLabel}扫描 (多线程递归)`);
  console.log(`  驱动器: ${config.drivePath}`);
  console.log(`  Worker数: ${config.workerCount}`);
  console.log(`  输出文件: ${config.outputPath}`);
  if (isTestMode) {
    console.log(`  测试目录: "${config.testDir}"`);
    console.log(`  测试目录已定义: ${config.testDir !== undefined && config.testDir !== null}`);
  }
  console.log('');

  const startTime = Date.now();

  try {
    // 验证驱动器
    console.log('📁 验证驱动器...');
    if (!fs.existsSync(config.drivePath)) {
      console.error(`❌ 驱动器不存在: ${config.drivePath}`);
      process.exit(1);
    }
    console.log(`  ✓ ${config.drivePath}`);
    console.log('');

    // 获取扫描目录
    console.log('🔍 扫描驱动器顶级目录...');
    let topDirs = [];
    try {
      topDirs = fs.readdirSync(config.drivePath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => path.join(config.drivePath, dirent.name));

      // 测试模式：只扫描指定目录
      if (isTestMode) {
        console.log(`  🔍 测试模式：过滤目录，仅保留 "${config.testDir}"`);
        const beforeFilter = topDirs.length;
        topDirs = topDirs.filter(dir => {
          const basename = path.basename(dir);
          const match = basename.toLowerCase() === config.testDir.toLowerCase();
          console.log(`    - ${basename} ${match ? '✓ 保留' : '✗ 跳过'}`);
          return match;
        });
        console.log(`  过滤结果: ${beforeFilter} → ${topDirs.length} 个目录`);

        if (topDirs.length === 0) {
          console.error(`❌ 测试目录不存在: ${config.testDir}`);
          process.exit(1);
        }
      }

      console.log(`  ✓ 发现 ${topDirs.length} 个目录`);
      topDirs.forEach(dir => {
        const weight = dirWeights[path.basename(dir)] || 1;
        console.log(`    - ${path.basename(dir)} (权重: ${weight})`);
      });
    } catch (error) {
      console.warn(`  ⚠️  无法读取顶级目录: ${error.message}`);
      process.exit(1);
    }
    console.log('');

    // 智能分配worker
    console.log('⚙️  分配Worker进程...');
    const allocations = allocateWorkers(topDirs);

    const workerPromises = [];
    for (const alloc of allocations) {
      for (const workerId of alloc.assignedWorkers) {
        workerPromises.push(spawnWorker(workerId, alloc.dir));
      }
    }

    for (const alloc of allocations) {
      const workerIds = alloc.assignedWorkers.join(', ');
      console.log(`  ${alloc.dirName} → Worker [${workerIds}]`);
    }
    console.log('');

    // 启动扫描
    console.log('🚀 启动扫描...');
    const allFiles = await Promise.all(workerPromises);
    console.log('');

    // 合并结果并去重
    console.log('🔄 合并结果...');
    const fileMap = new Map();
    let totalFiles = 0;

    for (const files of allFiles) {
      for (const file of files) {
        // 按file_path去重
        if (!fileMap.has(file.file_path)) {
          file.id = fileMap.size + 1;
          fileMap.set(file.file_path, file);
        }
      }
      totalFiles += files.length;
    }

    const mergedFiles = Array.from(fileMap.values());
    const duration = (Date.now() - startTime) / 1000;

    console.log(`  ✓ 总扫描: ${totalFiles} 个文件`);
    console.log(`  ✓ 去重后: ${mergedFiles.length} 个文件`);
    console.log('');

    // 生成统计信息
    const summary = {
      pdf_count: mergedFiles.filter(f => f.file_extension === '.pdf').length,
      total: mergedFiles.length,
      mode: isTestMode ? 'test' : 'full'
    };

    // 构建最终JSON
    const result = {
      scan_metadata: {
        scan_date: new Date().toISOString(),
        scan_duration_seconds: Math.round(duration),
        total_files: mergedFiles.length,
        drive_path: config.drivePath,
        worker_count: config.workerCount,
        test_mode: isTestMode,
        test_dir: config.testDir || null,
        format_version: '1.0'
      },
      files: mergedFiles,
      summary: summary
    };

    // 保存结果
    const outputDir = path.dirname(config.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(config.outputPath, JSON.stringify(result, null, 2), 'utf-8');

    // 更新扫描历史
    const historyPath = path.join(path.dirname(config.outputPath), 'scan-history.json');
    let history = { scans: [] };

    if (fs.existsSync(historyPath)) {
      try {
        history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
        if (!Array.isArray(history.scans)) {
          history.scans = [];
        }
      } catch (error) {
        console.warn(`  ⚠️  无法读取历史文件，将创建新的: ${error.message}`);
        history = { scans: [] };
      }
    }

    // 添加新的扫描记录
    history.scans.push({
      scan_date: result.scan_metadata.scan_date,
      file_count: result.summary.total,
      pdf_count: result.summary.pdf_count,
      scan_mode: result.scan_metadata.test_mode ? 'test' : 'full',
      test_dir: result.scan_metadata.test_dir || null,
      scan_duration_seconds: result.scan_metadata.scan_duration_seconds,
      worker_count: result.scan_metadata.worker_count,
      scan_file: config.outputPath,
      timestamp: new Date().toISOString()
    });

    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf-8');

    // 输出统计信息
    console.log('✅ 扫描完成！');
    console.log('');
    console.log('📊 扫描统计：');
    console.log(`  • 扫描模式: ${isTestMode ? '测试' : '全量'}`);
    console.log(`  • 扫描耗时: ${duration.toFixed(2)} 秒`);
    console.log(`  • 发现文件: ${mergedFiles.length} 个`);
    console.log(`  • 其中PDF: ${summary.pdf_count} 个`);
    console.log(`  • 平均速度: ${(mergedFiles.length / duration).toFixed(0)} 文件/秒`);
    console.log('');
    console.log(`📁 结果文件: ${config.outputPath}`);
    console.log(`  文件大小: ${(fs.statSync(config.outputPath).size / 1024 / 1024).toFixed(2)} MB`);
    console.log('');
    console.log(`📜 历史文件: ${historyPath}`);
    console.log(`  记录数: ${history.scans.length}`);
    console.log('');

    if (isTestMode) {
      console.log('✨ 测试扫描完成！验证无误后，运行完整扫描：');
      console.log('   node scripts/scan-g-drive.js');
    } else {
      console.log('✨ 全量扫描完成，可以使用 import-drawings.js 进行导入！');
    }

    // 显式退出进程
    process.exit(0);

  } catch (error) {
    console.error('❌ 扫描失败:', error.message);
    process.exit(1);
  }
}

// 运行扫描
scanDrive();
