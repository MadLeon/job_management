/**
 * G盘多线程全扫描程序 - 主协调程序
 * 
 * 功能：
 * 1. 分割G盘目录结构，分配给多个worker线程
 * 2. 每个worker启动一个PowerShell扫描进程
 * 3. 收集所有worker的结果
 * 4. 合并并输出最终JSON文件
 * 5. 计时和性能统计
 * 
 * 用法：
 *   node scripts/scan-g-drive.js [--workers 4] [--drive G:] [--output data/scan-results.json]
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
  drivePath: process.argv.find(arg => arg.startsWith('--drive'))?.split('=')[1] || 'G:',
  workerCount: parseInt(process.argv.find(arg => arg.startsWith('--workers'))?.split('=')[1] || '4'),
  outputPath: process.argv.find(arg => arg.startsWith('--output'))?.split('=')[1] || 'data/scan-results.json',
  timeout: 300000, // 5分钟超时
};

/**
 * 获取驱动器的根目录列表
 */
function getDriveRootDirs(drivePath) {
  try {
    if (!fs.existsSync(drivePath)) {
      console.error(`❌ 驱动器不存在: ${drivePath}`);
      process.exit(1);
    }

    const dirs = fs.readdirSync(drivePath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => path.join(drivePath, dirent.name))
      .slice(0, config.workerCount); // 限制顶级目录数

    if (dirs.length === 0) {
      dirs.push(drivePath); // 如果没有子目录，扫描驱动器根目录
    }

    return dirs;
  } catch (error) {
    console.error(`❌ 获取目录列表失败: ${error.message}`);
    process.exit(1);
  }
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
  console.log('📚 G盘多线程扫描开始');
  console.log(`  驱动器: ${config.drivePath}`);
  console.log(`  Worker数: ${config.workerCount}`);
  console.log(`  输出文件: ${config.outputPath}`);
  console.log('');

  const startTime = Date.now();

  try {
    // 获取扫描目录
    console.log('📁 获取目录结构...');
    const targetDirs = getDriveRootDirs(config.drivePath);
    console.log(`  ✓ 获取 ${targetDirs.length} 个扫描目标`);
    console.log('');

    // 启动所有worker
    console.log('⚙️  启动Worker进程...');
    const workerPromises = targetDirs.map((dir, i) =>
      spawnWorker(i + 1, dir)
    );

    // 等待所有worker完成
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
      doc_count: mergedFiles.filter(f => ['.doc', '.docx'].includes(f.file_extension)).length,
      other_count: 0
    };
    summary.other_count = mergedFiles.length - summary.pdf_count - summary.doc_count;

    // 构建最终JSON
    const result = {
      scan_metadata: {
        scan_date: new Date().toISOString(),
        scan_duration_seconds: Math.round(duration),
        total_files: mergedFiles.length,
        drive_path: config.drivePath,
        worker_count: config.workerCount,
        format_version: '1.0',
        test_mode: false
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

    // 输出统计信息
    console.log('✅ 扫描完成！');
    console.log('');
    console.log('📊 扫描统计：');
    console.log(`  • 扫描耗时: ${duration.toFixed(2)} 秒`);
    console.log(`  • 发现文件: ${mergedFiles.length} 个`);
    console.log(`  • PDF文件: ${summary.pdf_count} 个`);
    console.log(`  • DOC文件: ${summary.doc_count} 个`);
    console.log(`  • 其他文件: ${summary.other_count} 个`);
    console.log(`  • 平均速度: ${(mergedFiles.length / duration).toFixed(0)} 文件/秒`);
    console.log('');
    console.log(`📁 结果文件: ${config.outputPath}`);
    console.log(`  文件大小: ${(fs.statSync(config.outputPath).size / 1024 / 1024).toFixed(2)} MB`);
    console.log('');
    console.log('✨ 扫描完成，可以使用 import-drawings.js 进行导入！');

  } catch (error) {
    console.error('❌ 扫描失败:', error.message);
    process.exit(1);
  }
}

// 运行扫描
scanDrive();
