# 📖 Order Entry Log 数据库同步脚本 - 使用指南

## 🎯 脚本功能概述

这个脚本可以自动将 Order Entry Log.xlsm 中的 DELIVERY SCHEDULE 数据与 record.db 数据库同步。

**主要作用**:
- ✅ 识别OE文件中已存在于数据库的行，并填充order_item_id到AA列
- ✅ 识别OE文件中新增的行，自动插入数据库并返回order_item_id
- ✅ 识别数据库中已发货的PO（不在OE文件中），标记为过期（is_active=0）
- ✅ 生成详细的同步报告，包括处理统计和错误日志

---

## 📂 文件清单

| 文件 | 说明 |
|------|------|
| `scripts/update-oe-database.js` | **主脚本** - 核心同步逻辑 |
| `scripts/test-oe-sync.js` | 单元测试脚本 - 验证各模块 |
| `scripts/VERIFICATION_REPORT.md` | 验证报告 - 测试结果详情 |
| `scripts/logs/oe-sync-*.log` | 运行日志 - JSON格式报告 |

---

## 🚀 快速开始

### 1. 基础用法

```bash
# 使用默认路径 (data/Order Entry Log.xlsm)
node scripts/update-oe-database.js

# 指定自定义路径
node scripts/update-oe-database.js "C:\path\to\Order Entry Log.xlsm"
```

### 2. 运行测试

```bash
# 验证脚本的核心函数逻辑
node scripts/test-oe-sync.js
```

### 3. 查看报告

```bash
# 查找最新的日志文件
ls scripts/logs/

# 查看JSON报告内容
cat scripts/logs/oe-sync-2026-01-27.log
```

---

## 🔄 工作流程详解

### 📥 输入

**Excel文件**: `Order Entry Log.xlsm`
- Sheet: `DELIVERY SCHEDULE`
- 必需列:
  - A: O.E. (OE号)
  - B: Job # (作业号)
  - C: Customer (客户)
  - E: Part # (零件号/图纸号)
  - F: Rev (版本)
  - G: Contact (联系人)
  - I: M (行号)
  - L: P.O. (PO号，可为空或"npo")
  - P: Del. Req'd (要求交付日期)

### ⚙️ 处理流程

```
1️⃣ 读取Excel数据
   └─ DELIVERY SCHEDULE sheet中的所有数据行

2️⃣ 对每一行执行判断
   ├─ 查询: (oe_number, line_number) 是否在DB中存在？
   │
   ├─ YES → 场景A: 已存在
   │        └─ 记录order_item_id（待Excel侧填充）
   │
   └─ NO → 场景B: 新增
            ├─ 生成临时PO号（如果PO为空或"npo"）
            ├─ 级联插入: customer → contact → po → job → part → order_item
            └─ 返回新的order_item_id

3️⃣ 标记过期PO
   └─ 查找所有is_active=1的PO
      ├─ oe_number在文件中 → 保持is_active=1
      └─ oe_number不在文件中 → 更新is_active=0

4️⃣ 生成报告
   └─ 输出统计数据和错误日志
```

### 📤 输出

**数据库更新**:
- 新增/更新 customer, customer_contact, purchase_order, job, part, order_item

**Excel操作**（需手动或Excel宏处理）:
- 脚本返回AA列需要填充的数据
  ```json
  [
    { "row": 2, "column": 27, "value": 123 },
    { "row": 3, "column": 27, "value": 124 },
    ...
  ]
  ```

**日志报告**:
```
scripts/logs/oe-sync-2026-01-27.log
{
  "stats": {
    "total_rows": 100,
    "matched_existing": 80,
    "inserted_new": 15,
    "marked_inactive": 5,
    "errors": 0
  }
}
```

---

## 📋 数据映射

| OE列 | 对应数据库字段 | 说明 |
|------|--------|------|
| O.E. | purchase_order.oe_number | OE号（唯一标识的一部分） |
| Job # | job.job_number | 作业号 |
| Customer | customer.customer_name | 客户名 |
| Part # | part.drawing_number | 零件/图纸号 |
| Rev | part.revision | 版本 |
| Contact | customer_contact.contact_name | 联系人 |
| M | order_item.line_number | **行号（唯一标识的另一部分）** |
| P.O. | purchase_order.po_number | PO号（可为空→生成临时PO） |
| Del. Req'd | order_item.delivery_required_date | 要求交付日期 |
| **[AA列]** | **order_item.id** | **脚本输出：订单行ID** |

---

## 🔑 关键概念

### 临时PO号 (NPO)

当Excel中的P.O.列为空或"npo"时，脚本会自动生成临时PO号：

**格式**: `NPO-{YYYYMMDD}-{公司名}-{序号}`

**示例**:
```
NPO-20260127-ABILTD-01       (第一个)
NPO-20260127-ABILTD-02       (第二个)
NPO-20260127-BOMBARDIER-01   (新公司)
```

### 唯一性识别

脚本使用 **(oe_number, line_number)** 组合来唯一识别OE文件中的一行：

```sql
SELECT order_item.id
FROM order_item
JOIN job ON order_item.job_id = job.id
JOIN purchase_order ON job.po_id = purchase_order.id
WHERE purchase_order.oe_number = 'OE-20260127-001'
  AND order_item.line_number = '3'
```

### 过期PO标记

当数据库中的某个PO的`oe_number`在OE文件中不存在时，被标记为已发货：

```sql
UPDATE purchase_order 
SET is_active = 0, updated_at = datetime('now', 'localtime')
WHERE is_active = 1 AND oe_number NOT IN (...)
```

---

## ⚠️ 使用须知

### 前置条件

- ✅ Windows环境（PowerShell COM对象）
- ✅ 已安装Excel应用
- ✅ `data/record.db` 数据库已存在
- ✅ 数据库表结构已通过迁移脚本创建

### 运行限制

- 脚本运行期间Excel应处于可访问状态
- 不支持在Excel中同时打开同一文件进行编辑
- 建议在非工作时间或静默时运行

### 数据安全

脚本具有完整的事务管理：
- 所有操作在一个事务中执行
- 任何错误都会自动回滚
- 已标记为过期的PO在出错时会恢复为active=1

---

## 🛠️ 故障排除

### 问题1: "Excel文件不存在"

```bash
# ❌ 错误
node scripts/update-oe-database.js

# ✅ 解决方案1: 检查默认路径
ls data/Order\ Entry\ Log.xlsm

# ✅ 解决方案2: 指定完整路径
node scripts/update-oe-database.js "D:\work\Record Tech\job_management\data\Order Entry Log.xlsm"
```

### 问题2: "数据库连接失败"

```bash
# 检查record.db是否存在
ls data/record.db

# 检查数据库权限
# 确保文件不是只读的
```

### 问题3: "PowerShell执行失败"

```bash
# 检查PowerShell版本
powershell -NoProfile -Command "$PSVersionTable.PSVersion"

# 检查Excel是否已安装
powershell -NoProfile -Command "New-Object -ComObject Excel.Application"
```

### 问题4: "外键约束失败"

- 原因: customer/contact 不存在
- 解决: 确保数据库中customer表已有基础数据

---

## 📊 日志分析

### 日志文件位置

```
scripts/logs/oe-sync-2026-01-27.log
```

### 日志结构

```json
{
  "timestamp": "2026-01-27T10:30:45.123Z",
  "duration_ms": 5234,
  "stats": {
    "total_rows": 100,
    "matched_existing": 80,      // 已存在于DB的行
    "inserted_new": 15,           // 新插入的行
    "updated_order_item_id": 95,  // 填充了ID的行
    "marked_inactive": 5,         // 标记为过期的PO
    "errors": [],
    "warnings": []
  },
  "details": [
    {
      "type": "matched",
      "status": "success",
      "oe_number": "OE-20260127-001",
      "line_number": "1",
      "order_item_id": 123
    },
    ...
  ]
}
```

### 关键指标

| 指标 | 说明 | 理想范围 |
|------|------|--------|
| matched_existing | 已存在的记录 | 大多数 |
| inserted_new | 新增的记录 | 较少 |
| marked_inactive | 标记过期的PO | 0-5 |
| errors | 错误数量 | 0 |

---

## 🔐 数据库事务

脚本使用SQLite事务确保数据一致性：

```
BEGIN TRANSACTION (IMMEDIATE)
  ├─ 处理所有OE行（插入/更新）
  ├─ 标记过期PO
  ├─ 如有任何错误
  │  └─ ROLLBACK（全部撤销）
  └─ 如全部成功
     └─ COMMIT（持久化）
```

**回滚场景**:
- ✅ Excel读取失败
- ✅ 级联插入失败
- ✅ 任何数据库操作异常
- ✅ 自动恢复已标记的PO状态

---

## 📞 常见问题

**Q: 脚本需要多久运行完?**  
A: 取决于OE文件大小。通常100行数据约5-10秒。

**Q: 可以在Excel文件打开时运行吗?**  
A: 不建议。建议先关闭Excel文件。

**Q: 如果运行出错，数据会丢失吗?**  
A: 不会。脚本具有完整事务管理，出错自动回滚。

**Q: AA列的order_item_id需要手动填充吗?**  
A: 是的。脚本返回数据清单，需要Excel宏或手动处理。

**Q: 支持Linux/Mac吗?**  
A: 当前不支持（PowerShell COM对象）。可改用xlsx库适配。

---

## 📚 相关文档

- [验证报告](./VERIFICATION_REPORT.md) - 单元测试结果
- [脚本源码](./update-oe-database.js) - 完整实现
- [业务逻辑](../src/order%20entry%20log/business%20logic.txt) - OE流程说明
- [数据库架构](../data/structure.txt) - 表结构参考

---

**最后更新**: 2026-01-27  
**版本**: 1.0  
**状态**: ✅ 已验证可用
