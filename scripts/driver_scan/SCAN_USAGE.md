# G盘文件扫描系统 - 使用说明

## 📋 系统概述

G盘文件扫描系统包含以下核心脚本：

| 脚本 | 用途 | 说明 |
|------|------|------|
| `scan-g-drive.js` | 主扫描程序 | 多线程扫描G盘，生成JSON结果 |
| `scan-g-drive-worker.ps1` | PowerShell worker | 实际执行扫描的脚本 |
| `import-drawings.js` | 数据导入 | 将JSON导入到数据库 |
| `scan-incremental.js` | 增量扫描 | 检测文件变化，更新数据库 |

---

## 🚀 使用流程

### 第一次完整扫描

#### 1. 执行G盘扫描
```bash
# 基础用法（使用默认参数）
node scripts/scan-g-drive.js

# 指定参数
node scripts/scan-g-drive.js --drive=G: --workers=4 --output=data/scan-results.json
```

**参数说明**：
- `--drive` - 要扫描的驱动器（默认 G:）
- `--workers` - Worker线程数量（默认 4，建议2-8）
- `--output` - 输出文件路径（默认 data/scan-results.json）

**输出示例**：
```
📚 G盘多线程扫描开始
  驱动器: G:
  Worker数: 4
  输出文件: data/scan-results.json

📁 获取目录结构...
  ✓ 获取 4 个扫描目标

⚙️  启动Worker进程...
  [Worker 1] 扫描: G:\DIR1
  [Worker 2] 扫描: G:\DIR2
  [Worker 3] 扫描: G:\DIR3
  [Worker 4] 扫描: G:\DIR4
  [Worker 1] ✓ 发现 3,100 个文件
  [Worker 2] ✓ 发现 3,050 个文件
  [Worker 3] ✓ 发现 3,200 个文件
  [Worker 4] ✓ 发现 2,995 个文件

🔄 合并结果...
  ✓ 总扫描: 12,345 个文件
  ✓ 去重后: 12,345 个文件

✅ 扫描完成！

📊 扫描统计：
  • 扫描耗时: 45.32 秒
  • 发现文件: 12,345 个
  • PDF文件: 8,500 个
  • DOC文件: 2,100 个
  • 其他文件: 1,745 个
  • 平均速度: 272 文件/秒

📁 结果文件: data/scan-results.json
  文件大小: 2.30 MB
```

#### 2. 导入到数据库
```bash
# 基础用法
node scripts/import-drawings.js

# 指定源文件
node scripts/import-drawings.js --source=data/scan-results.json
```

**输出示例**：
```
📚 图纸文件导入程序
  源文件: data/scan-results.json
  数据库: data/record.db

📖 加载扫描结果...
  ✓ 加载完成: 12,345 个文件
  ✓ 扫描日期: 2026-01-07T19:08:54.505Z

📊 开始导入数据库...
  ✓ 已导入: 1000 个文件
  ✓ 已导入: 2000 个文件
  ...
  ✓ 已导入: 12000 个文件

✅ 导入完成！

📊 导入统计：
  • 导入耗时: 12.45 秒
  • 总处理: 12,345 个文件
  • 成功: 12,345 个
  • 失败: 0 个
  • 平均速度: 991 文件/秒

💾 数据库状态：
  • drawing_file 表: 12,345 条记录
```

---

### 后续增量扫描

#### 执行增量扫描
```bash
# 基础用法（使用默认参数）
node scripts/scan-incremental.js

# 指定参数
node scripts/scan-incremental.js --drive=G: --workers=4
```

**输出示例**：
```
📚 增量扫描程序
  驱动器: G:

📖 加载历史扫描...
  ✓ 上次扫描: 12,345 个文件

⚙️  执行新的扫描...
[执行完整扫描输出...]

  ✓ 本次扫描: 12,450 个文件

🔍 对比扫描结果...
  ✓ 新增: 150 个文件
  ✓ 修改: 30 个文件
  ✓ 删除: 25 个文件
  ✓ 未变: 12,245 个文件

💾 更新数据库...
  ✓ 插入: 150 个新文件
  ✓ 更新: 30 个已修改文件
  ✓ 标记删除: 25 个已删除文件
  💾 数据库总数: 12,470 条
  💾 活跃记录: 12,445 条

📁 变更记录保存: data/scan-delta.json

✅ 增量扫描完成！

📊 变更统计：
  • 新增: 150 个文件
  • 修改: 30 个文件
  • 删除: 25 个文件
  • 未变: 12,245 个文件

✨ 所有更新已完成！
```

---

## 📁 文件结构说明

### 输出文件

```
data/
├── scan-results.json          # 当前扫描结果（会被覆盖）
├── scan-results-2026-01-07.json  # 日期归档文件
├── scan-results-2026-01-14.json
├── scan-history.json          # 扫描历史记录
├── scan-delta.json            # 最后一次增量扫描的变更记录
└── record.db                  # 生产数据库
    └── drawing_file 表（存储所有文件信息）
```

### JSON格式说明

#### scan-results.json 格式
```json
{
  "scan_metadata": {
    "scan_date": "2026-01-07T19:08:54.505Z",
    "scan_duration_seconds": 45,
    "total_files": 12345,
    "drive_path": "G:",
    "worker_count": 4,
    "format_version": "1.0",
    "test_mode": false
  },
  "files": [
    {
      "id": 1,
      "file_name": "drawing.pdf",
      "file_path": "G:\\DEPT\\drawing.pdf",
      "file_size_bytes": 1187923,
      "last_modified_utc": "2025-10-07T14:14:41Z",
      "file_extension": ".pdf"
    },
    ...
  ],
  "summary": {
    "pdf_count": 8500,
    "doc_count": 2100,
    "other_count": 1745
  }
}
```

#### scan-delta.json 格式
```json
{
  "delta_date": "2026-01-14T10:30:00Z",
  "summary": {
    "added": 150,
    "modified": 30,
    "deleted": 25,
    "unchanged": 12245
  },
  "files": {
    "added": [...],      # 前100条新增文件
    "modified": [...],   # 前100条修改文件
    "deleted": [...]     # 前100条删除文件
  }
}
```

---

## ⚙️ 性能优化建议

### Worker线程数量调整

**根据系统配置调整**：
```bash
# 4核CPU建议4个worker
node scripts/scan-g-drive.js --workers=4

# 8核CPU建议6-8个worker
node scripts/scan-g-drive.js --workers=8

# 网络存储建议2-4个worker（减少并发IO）
node scripts/scan-g-drive.js --workers=2
```

### 扫描计划建议

```bash
# 首次全扫描（需要较长时间）
# 建议在非工作时间执行
node scripts/scan-g-drive.js

# 每周增量扫描（快速）
# 建议在每周一凌晨执行
node scripts/scan-incremental.js

# Cron任务示例（Linux/Mac）
0 2 * * 1 cd /path/to/project && node scripts/scan-incremental.js

# Windows任务计划程序可类似配置
```

---

## 🔍 查询和验证

### 数据库查询示例

```sql
-- 查看总文件数
SELECT COUNT(*) FROM drawing_file;

-- 查看最新扫描的文件
SELECT * FROM drawing_file 
WHERE created_at >= date('now', '-1 day') 
LIMIT 10;

-- 按文件类型统计
SELECT 
  file_extension, 
  COUNT(*) as count 
FROM drawing_file 
GROUP BY file_extension;

-- 查看删除的文件
SELECT * FROM drawing_file 
WHERE is_active = 0 
LIMIT 10;
```

### 命令行查询

```bash
# 使用 jq 查看 JSON 摘要
cat data/scan-results.json | jq .summary

# 查看前5个文件
cat data/scan-results.json | jq '.files[0:5]'

# 统计PDF数量
cat data/scan-results.json | jq '[.files[] | select(.file_extension == ".pdf")] | length'
```

---

## ⚠️ 常见问题

### Q: 扫描被中断了怎么办？
A: 增量扫描会加载上次的完整结果，重新运行即可继续。历史记录会保留，不会丢失。

### Q: 如何只扫描特定文件夹？
A: 目前scan-g-drive.js按顶级目录分割。如需扫描特定文件夹，可修改脚本或运行scan-local-test.js的本地版本。

### Q: 删除的文件是永久删除还是软删除？
A: 使用软删除（is_active = 0），保留历史记录供查询。

### Q: 可以并行运行多个扫描吗？
A: 不建议。同一驱动器不要同时运行多个扫描任务，可能导致结果不一致。

### Q: 如何重置扫描历史？
A: 删除 `data/scan-history.json` 和 `data/scan-delta.json`，然后重新执行首次扫描。

---

## 🔐 安全性说明

- ✅ 100% 只读操作 - 不修改、删除任何文件
- ✅ 权限处理 - 跳过权限拒绝的目录，继续扫描
- ✅ 超时保护 - 防止单个进程无限挂起
- ✅ 事务处理 - 数据库导入使用事务，确保一致性

---

## 📊 预期性能

| 场景 | 耗时 | 速率 |
|------|------|------|
| 本地测试（259文件） | 0.43秒 | 614文件/秒 |
| 预期G盘（12K文件） | 45秒 | 270文件/秒 |
| 数据库导入（12K文件） | 12秒 | 1000条/秒 |
| 增量扫描（假设10%变化） | 50秒 | 270文件/秒 |

*注：实际性能取决于网络速度、磁盘IO和系统负载*

---

## 📞 调试信息

### 启用详细日志（可选）
修改脚本中的日志级别，或添加 `--verbose` 参数。

### 查看扫描进度
扫描进行中，可查看 `data/scan-results.json` 的文件大小增长。

### 性能分析
检查 PowerShell 进程的CPU使用率和内存占用。

---

**版本**: 1.0  
**最后更新**: 2026-01-07  
**维护者**: AI Copilot
