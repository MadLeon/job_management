---
name: database
description: 'Database interaction and schema management. Use this skill when: querying or manipulating the job management database (\\rtdnas2\OE\record.db); creating or running database migrations; checking database structure and integrity; understanding table relationships and schemas; writing SQL queries against the job management database. Trigger on requests involving: database operations, schema changes, data persistence, migration tasks, database debugging, or SQL queries. Reference the schema documentation for table structure before writing queries.'
license: Proprietary
---

# 数据库交互与架构管理

## 概述

- 本项目使用 SQLite3 数据库存储工作管理、订单、零件、生产等数据。正式数据库位于 `\\rtdnas2\OE\record.db`，开发环境使用 `data/record.db`。
- 本系统运行在 Windows 环境, 如需编写相关脚本，请使用 PowerShell。

## 参考资源

- [数据库表结构详细文档](./reference/schema-reference.md)
- [数据库表总结（记录统计）](./reference/table-summary.md)

## 快速开始

### 检查数据库结构和内容

- 参考./reference文件夹中的文件来了解数据库表结构、记录数、样本数据
- 如需获取最新统计信息，运行以下命令：

```powershell
node ./scripts/check-db.js
```

## 迁移系统

- 迁移系统的入口文件位于 `/scripts/migrate.js`
- 记录当前迁移状态的文件为 `/data/migrations.json`，包含已应用迁移的列表
- 迁移文件位于 `/scripts/migrations/`，命名格式 `NNN_description.js`

- package.json 中定义的迁移命令：
  - "db:migrate": "node scripts/migrate.js up",
  - "db:migrate:down": "node scripts/migrate.js down",
  - "db:migrate:status": "node scripts/migrate.js status"

## 数据库备份与恢复

### 备份（开发环境）

```powershell
Copy-Item data/record.db "data/record.db.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
```

## 最佳实践

- **使用外键约束**：在设计新表时定义适当的外键关系
- **时间戳**：使用 `datetime('now', 'localtime')` 记录本地时间
- **事务安全**：多条相关 SQL 语句应包装在事务中
- **备份迁移前**：始终在应用重大迁移前备份数据库

## 环境配置

- **开发**：`data/record.db` (SQLite3)
- **生产**：`\\rtdnas2\OE\record.db` (SQLite3, 网络挂载)
- **迁移跟踪**：`data/migrations.json` (已应用迁移列表)
