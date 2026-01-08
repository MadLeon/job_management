/**
 * 本地测试版扫描脚本 - 扫描指定目录并生成JSON
 * 
 * 用途：对本地文件夹（如 C:\Users\ee\Desktop\Drawing History）进行快速测试
 * 输出：JSON 格式的文件扫描结果
 * 安全：100% 只读，不修改任何文件
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 本地测试扫描 - 简化版本
 */
async function scanLocalDirectory() {
  const testDir = 'C:\\Users\\ee\\Desktop\\Drawing History';
  const outputFile = './data/scan-results-test.json';

  console.log('📂 本地文件夹扫描测试');
  console.log(`  扫描目录: ${testDir}`);
  console.log(`  输出文件: ${outputFile}`);
  console.log('');

  // 检查目录是否存在
  if (!fs.existsSync(testDir)) {
    console.error(`❌ 错误：目录不存在: ${testDir}`);
    process.exit(1);
  }

  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    // 调用 PowerShell 脚本进行扫描
    const psScript = path.join(__dirname, 'scan-local-worker.ps1');

    if (!fs.existsSync(psScript)) {
      console.error(`❌ 错误：PowerShell脚本不存在: ${psScript}`);
      reject(new Error('PowerShell script not found'));
      return;
    }

    console.log('⚙️  启动 PowerShell 扫描进程...\n');

    const ps = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', psScript,
      '-TargetDir', testDir,
      '-AsJson'
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf-8'
    });

    let output = '';
    let errorOutput = '';

    ps.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write('.');  // 进度指示
    });

    ps.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ps.on('close', (code) => {
      console.log('\n');

      if (code !== 0) {
        console.error(`❌ PowerShell 进程异常退出 (code: ${code})`);
        if (errorOutput) {
          console.error('错误输出：', errorOutput);
        }
        reject(new Error(`PowerShell exited with code ${code}`));
        return;
      }

      try {
        // 解析输出
        const lines = output.trim().split('\n').filter(l => l.trim());
        const files = [];

        for (const line of lines) {
          try {
            const fileObj = JSON.parse(line);
            files.push(fileObj);
          } catch (e) {
            // 非JSON行，跳过（可能是进度输出）
            if (!line.startsWith('.') && !line.startsWith('⚙')) {
              console.log(`  [DEBUG] 跳过非JSON行: ${line.substring(0, 50)}`);
            }
          }
        }

        const duration = (Date.now() - startTime) / 1000;

        // 构建最终JSON
        const result = {
          scan_metadata: {
            scan_date: new Date().toISOString(),
            scan_duration_seconds: Math.round(duration),
            total_files: files.length,
            directory_scanned: testDir,
            format_version: '1.0',
            test_mode: true
          },
          files: files,
          summary: {
            pdf_count: files.filter(f => f.file_name.toLowerCase().endsWith('.pdf')).length,
            doc_count: files.filter(f => f.file_name.toLowerCase().endsWith('.doc') || f.file_name.toLowerCase().endsWith('.docx')).length,
            other_count: files.length - files.filter(f =>
              f.file_name.toLowerCase().endsWith('.pdf') ||
              f.file_name.toLowerCase().endsWith('.doc') ||
              f.file_name.toLowerCase().endsWith('.docx')
            ).length
          }
        };

        // 保存到文件
        const dataDir = './data';
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }

        fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), 'utf-8');

        // 输出统计信息
        console.log('✅ 扫描完成！');
        console.log('');
        console.log('📊 扫描统计：');
        console.log(`  • 扫描耗时: ${duration.toFixed(2)} 秒`);
        console.log(`  • 发现文件: ${files.length} 个`);
        console.log(`  • PDF文件: ${result.summary.pdf_count} 个`);
        console.log(`  • DOC文件: ${result.summary.doc_count} 个`);
        console.log(`  • 其他文件: ${result.summary.other_count} 个`);
        console.log('');
        console.log(`📁 结果文件: ${outputFile}`);
        console.log(`  文件大小: ${(fs.statSync(outputFile).size / 1024).toFixed(2)} KB`);
        console.log('');

        // 显示样本数据
        if (files.length > 0) {
          console.log('📋 样本数据（前3条）：');
          files.slice(0, 3).forEach((f, i) => {
            console.log(`  [${i + 1}] ${f.file_name}`);
            console.log(`      路径: ${f.file_path}`);
            console.log(`      大小: ${(f.file_size_bytes / 1024).toFixed(2)} KB`);
            console.log(`      修改时间: ${f.last_modified_utc}`);
            console.log('');
          });
        }

        console.log('✨ 测试完成，等待您的验收！');
        resolve();

      } catch (error) {
        console.error('❌ 处理结果失败:', error.message);
        reject(error);
      }
    });

    ps.on('error', (error) => {
      console.error('❌ 启动 PowerShell 失败:', error.message);
      reject(error);
    });
  });
}

// 运行扫描
scanLocalDirectory().catch(error => {
  console.error('❌ 扫描失败:', error);
  process.exit(1);
});
