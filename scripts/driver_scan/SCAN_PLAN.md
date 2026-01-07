# G盘全扫描系统设计方案

## 📋 任务概览
1. **第5项**：设计多线程G盘全扫描程序（Node.js驱动PowerShell）
2. **第6项**：讨论并决定中间文件格式（CSV vs JSON）
3. **第7项**：设计增量扫描脚本

---

## 🎯 总体架构设计

### 核心理念
- **主程序**：Node.js（协调和管理）
- **扫描工作**：PowerShell脚本（实际文件扫描）
- **中间存储**：CSV或JSON（扫描结果）
- **导入**：Node.js脚本（将中间文件导入DB）

```
┌─────────────────────────────────────────────────────┐
│                  Node.js主程序                      │
│  (scan-g-drive.js - 多线程协调，管理PowerShell)    │
└───────────┬─────────────────────────────────────────┘
            │
    ┌───────┴──────────┬──────────────┬──────────────┐
    │                  │              │              │
┌───▼───┐ ┌────────┐ ┌─▼───────┐ ┌────▼───────┐
│Worker1│ │Worker2 │ │Worker3  │ │  Worker N  │
│ PS-1  │ │ PS-2   │ │ PS-3    │ │   PS-N     │
└───┬───┘ └───┬────┘ └──┬──────┘ └────┬───────┘
    │         │         │             │
    └─────────┴─────────┴─────────────┘
            ↓
    ┌──────────────────────┐
    │ 中间文件（CSV/JSON）  │
    │ scan-results.[csv|json]
    └──────────┬───────────┘
               ↓
    ┌──────────────────────┐
    │ 导入脚本            │
    │ import-drawings.js   │
    └──────────┬───────────┘
               ↓
    ┌──────────────────────┐
    │  record.db           │
    │ drawing_file表       │
    └──────────────────────┘

增量扫描流程：
    ┌──────────────────────┐
    │ 增量扫描程序         │
    │ scan-incremental.js  │
    └──────────┬───────────┘
               ↓
    ┌──────────────────────┐
    │ 比较历史+新扫描结果  │
    │ 检测新增/修改/删除   │
    └──────────┬───────────┘
               ↓
    ┌──────────────────────┐
    │ 更新 drawing_file    │
    └──────────────────────┘
```

---

## 📁 文件结构设计

```
scripts/
├── scan-g-drive.js           ← 【NEW】多线程主程序
├── scan-g-drive-worker.ps1   ← 【NEW】PowerShell扫描脚本
├── import-drawings.js        ← 【NEW】导入中间文件到DB
├── scan-incremental.js       ← 【NEW】增量扫描程序
└── migrations/
    └── 006_migrate_data_from_jobs_db.js

data/
├── record.db                 ← 生产数据库
├── scan-results.json         ← 【NEW】首次全扫描结果
└── scan-history.json         ← 【NEW】扫描历史记录（用于增量扫描）
```

---

## 🔧 第5项：多线程G盘全扫描程序详细设计

### 5.1 Node.js主程序 (`scan-g-drive.js`)

**功能**：
- 创建N个worker线程（可配置，默认4个）
- 将G盘按目录分割，分配给各worker
- 收集所有worker的扫描结果
- 合并结果到中间文件
- 计时和性能统计

**配置参数**：
```javascript
{
  drivePath: 'G:',
  workerCount: 4,           // 根据CPU核心数
  filePattern: '*.pdf',     // 或 '*.*'
  timeout: 300000,          // 5分钟超时
  outputFormat: 'json',     // 或 'csv'
  outputPath: 'data/scan-results.json'
}
```

**输出统计**：
```
✓ G盘扫描完成
  • 扫描耗时: 45分钟
  • 发现文件: 12,345 个
  • Worker 1: 3,100 个文件
  • Worker 2: 3,050 个文件
  • Worker 3: 3,200 个文件
  • Worker 4: 2,995 个文件
  • 平均每个文件: 0.22ms
  • 结果文件: data/scan-results.json (2.3 MB)
```

### 5.2 PowerShell扫描脚本 (`scan-g-drive-worker.ps1`)

**功能**：
- 递归扫描指定目录
- 提取文件名、路径、大小、修改时间等
- 输出为JSON格式（每行一条记录，方便分割）
- 仅读取模式，0%修改风险

**安全措施**：
- 使用 `-ReadOnly` 打开文件句柄（如适用）
- 不使用任何可能修改文件的API
- 错误处理：跳过权限拒绝的目录

**输出格式**（JSON lines）：
```json
{"id":1,"file_name":"drawing_v1.pdf","file_path":"G:\\DEPT\\PROJECT\\drawing_v1.pdf","file_size":1024000,"last_modified":"2025-01-07T10:30:00Z","file_hash":"abc123def456"}
{"id":2,"file_name":"manual.pdf","file_path":"G:\\DEPT\\PROJECT\\manual.pdf","file_size":2048000,"last_modified":"2025-01-06T14:22:00Z","file_hash":"xyz789uvw012"}
```

### 5.3 资源优化

**减少带宽占用**：
- ✅ 仅扫描，不复制或下载文件
- ✅ 使用轻量级的 PowerShell Get-ChildItem
- ✅ 按目录分割，避免单个线程过载
- ✅ 定期gc（垃圾回收）防止内存溢出

**不影响他人使用**：
- ✅ 仅读操作，0%修改风险
- ✅ 使用普通用户权限（不需要管理员）
- ✅ 实时性能监控，可动态调整线程数
- ✅ 错误处理：跳过权限拒绝，不中断扫描

---

## 💾 第6项：中间文件格式对比与选择

### 格式对比

| 特性 | CSV | JSON |
|------|-----|------|
| **文件大小** | 更小 (1.8MB) | 稍大 (2.3MB) |
| **可读性** | 低（对用户） | 高（有格式化） |
| **解析速度** | 快 | 稍慢 |
| **查询支持** | 需额外工具 | 可用jq等工具 |
| **嵌套数据** | 不支持 | 支持（扩展性好） |
| **导入到DB** | 简单（CSV直接导入） | 需JSON解析 |
| **增量扫描** | 需全比对 | 可结构化对比 |
| **版本扩展** | 困难（字段变化） | 容易（可添加字段） |

### 📊 建议方案：**采用JSON格式**

**原因**：
1. **未来扩展性** - 后续可能需要添加：
   - 文件hash值（去重）
   - 修改人员信息（如果有）
   - 文件分类标签
   - 扫描时的元数据

2. **增量扫描支持** - JSON格式天然支持：
   - 保存完整对象，便于比对
   - 可添加扫描时间戳
   - 支持版本管理

3. **查询灵活性** - 可使用现代工具：
   - `jq` 命令行查询
   - Python/Node.js json库
   - VS Code JSON预览

### JSON结构设计

```json
{
  "scan_metadata": {
    "scan_date": "2025-01-07T15:30:00Z",
    "scan_duration_seconds": 2700,
    "total_files": 12345,
    "drive_path": "G:",
    "worker_count": 4,
    "format_version": "1.0"
  },
  "files": [
    {
      "id": 1,
      "file_name": "drawing_v1.pdf",
      "file_path": "G:\\DEPT\\PROJECT\\drawing_v1.pdf",
      "file_size_bytes": 1024000,
      "last_modified_utc": "2025-01-07T10:30:00Z",
      "file_hash_md5": "abc123def456",
      "is_pdf": true
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

---

## 🔄 第7项：增量扫描脚本设计

### 流程图

```
初次运行：
  scan-g-drive.js → scan-results.json
                  → 导入到DB drawing_file表
                  → 保存副本到 scan-history.json

后续增量扫描：
  scan-incremental.js
    ├─ 加载 scan-history.json（上次完整结果）
    ├─ 执行新的 scan-g-drive.js（获取最新结果）
    ├─ 比对两个结果集
    │  ├─ NEW：上次无，本次有
    │  ├─ DELETED：上次有，本次无
    │  ├─ MODIFIED：内容变化（大小/时间）
    │  └─ UNCHANGED：无变化
    ├─ 生成变更记录 (delta.json)
    ├─ 更新 DB
    │  ├─ INSERT 新文件
    │  ├─ UPDATE 修改文件（last_modified_at）
    │  ├─ DELETE 已删除文件
    └─ 保存新的 scan-history.json
```

### 关键特性

**1. 智能增量检测**
```javascript
// 比对逻辑
const newSet = new Map(current.files.map(f => [f.file_path, f]));
const oldSet = new Map(history.files.map(f => [f.file_path, f]));

for (const [path, newFile] of newSet) {
  const oldFile = oldSet.get(path);
  if (!oldFile) {
    delta.added.push(newFile);  // 新增
  } else if (oldFile.last_modified_utc !== newFile.last_modified_utc) {
    delta.modified.push(newFile);  // 修改
  }
}

for (const [path, oldFile] of oldSet) {
  if (!newSet.has(path)) {
    delta.deleted.push(path);  // 删除
  }
}
```

**2. 扫描历史管理**
```json
// scan-history.json - 保存每次完整扫描的结果
{
  "scan_1": {
    "scan_date": "2025-01-07T10:00:00Z",
    "file_count": 12000,
    "hash": "abc123"  // 用于快速比对
  },
  "scan_2": {
    "scan_date": "2025-01-14T10:00:00Z",
    "file_count": 12345,
    "hash": "xyz789"
  }
}
```

**3. 数据库更新策略**
- INSERT：新发现的文件
- UPDATE：修改时间或大小改变的文件
- SOFT DELETE：标记 is_deleted=1（保留历史）
- 可选：按日期范围查询变更历史

---

## 🚀 实现时间表

```
├─ scan-g-drive.js         【5-7天】
│  ├─ Worker管理
│  ├─ PowerShell集成
│  ├─ 结果合并
│  └─ 性能优化
│
├─ scan-g-drive-worker.ps1 【2-3天】
│  ├─ 递归扫描逻辑
│  ├─ 安全模式验证
│  └─ 输出格式
│
├─ import-drawings.js      【2-3天】
│  ├─ JSON解析
│  ├─ 数据验证
│  └─ 批量导入
│
└─ scan-incremental.js     【4-5天】
   ├─ 差异算法
   ├─ DB更新逻辑
   └─ 增量验证
```

---

## ⚙️ 配置与使用

### 首次全扫描
```bash
# 扫描整个G盘
node scripts/scan-g-drive.js --drive G: --workers 4 --format json

# 导入结果到数据库
node scripts/import-drawings.js --source data/scan-results.json --format json
```

### 后续增量扫描
```bash
# 执行增量扫描
node scripts/scan-incremental.js --history data/scan-history.json

# 自动检测变更并更新DB
```

### 定时任务（可选）
```json
// 在 package.json 添加脚本
{
  "scripts": {
    "scan:full": "node scripts/scan-g-drive.js && node scripts/import-drawings.js",
    "scan:incremental": "node scripts/scan-incremental.js",
    "scan:schedule": "node-cron '0 22 * * 0' npm run scan:incremental"
  }
}
```

---

## 🔐 安全与验证

### 只读验证
- ✅ PowerShell脚本不使用任何写入API
- ✅ 权限检查：使用最小权限运行
- ✅ 错误处理：跳过权限拒绝，继续扫描

### 数据验证
- 检查文件路径有效性（防止注入）
- 验证文件大小合理性
- 检测重复路径（去重）
- 生成扫描完整性报告

### 性能监控
```
扫描进度：
  已扫描: 5,432 / 12,345 文件 (44%)
  耗时: 25 分钟
  预计总耗时: 57 分钟
  当前速率: 3.6 文件/秒
```

---

## 📝 下一步行动

**待审核内容**：
1. ✓ 整体架构是否合理？合理
2. ✓ JSON格式是否满足需求？接受
3. ✓ 多线程方案是否适当？适当
4. ✓ 增量扫描逻辑是否可行？可行
5. ✓ 性能优化建议是否充分？充分

**待确认项**：
- [ ] PowerShell版本要求（PS5.1 vs PS7+）？尽量兼容
- [ ] G盘大小估计？文件数量估计？超20w
- [ ] 扫描频率（每周/每月）？每周
- [ ] 是否需要文件hash验证去重？不需要
- [ ] 数据库中是否保留已删除文件的记录？什么是已删除文件, 如果你指的是pdf文件已不在系统中, 可以在数据库中删除

---

**状态**: 待用户审核方案
