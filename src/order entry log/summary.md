# Order Entry Log 模块重写会话总结

## 📌 会话主要任务

将 Order Entry Log Excel 宏模块从旧数据库 (jobs.db) 迁移到新数据库 (record.db)，并实现级联更新和 Candu 订单导出功能。

---

## ✅ 本会话 Todos

- [x] 分析现有 Order Entry Log 业务逻辑
- [x] 对比 MP Schedule 的 modCreateHyperLinks.bas 实现
- [x] 验证 SQLite 接口兼容性
- [x] 制定详细的重写方案
- [x] 重写 mod_CreateHyperlinks.bas（采用三阶段匹配）
- [x] 重写 mod_AddNewJobToDB.bas（级联插入多表）
- [x] 修改 mod_AddNextNewRecord.bas 和 mod_EMP.bas
- [x] 实现 ExportCanduOrders 功能（CSV 导出）

---

## 📝 操作及变更细节

### 1. mod_CreateHyperlinks.bas 重写

**变更**：
- 更新 DB_PATH 为 `D:\work\Record Tech\job_management\data\record.db`
- 采用 MP Schedule 的三阶段匹配逻辑：
  1. **精确查询**：通过 drawing_number 在 part 表查找，再从 drawing_file 获取活跃文件
  2. **模糊查询**：在 drawing_file 的 file_name 和 file_path 中模糊搜索
  3. **PO 号验证**：如多个结果，优先选择包含 PO 号的文件，取最新修改时间
- 简化代码结构，增加代码注释（采用 JSDoc 风格）
- 保留 `CreateHyperlinks()`、`CreateSingleHyperlink()` 和 `AddHyperlink()` 的公共 API

**核心函数**：
- `FindDrawingFile(drawingNumber, poNumber)` - 主查询函数
- `FuzzyMatchDrawingFile(drawingNumber, poNumber)` - 模糊匹配逻辑

### 2. mod_AddNewJobToDB.bas 完全重写

**变更**：
- 从单表插入（jobs.db）改为多表级联插入（record.db）
- 实现级联关系：customer → customer_contact → purchase_order → job → order_item → part
- 采用 `FindOrCreate` 模式确保数据完整性和一致性

**新增函数**：
- `FindOrCreateCustomer(customerName)` - 查找或创建客户
- `FindOrCreateCustomerContact(customerId, contactName)` - 查找或创建联系人
- `FindOrCreatePurchaseOrder(poNumber, oeNumber, contactId)` - 查找或创建采购单
- `FindOrCreateJob(jobNumber, poId)` - 查找或创建作业
- `FindOrCreatePart(drawingNumber, revision)` - 查找或创建零件
- `CreateOrderItem(jobId, partId, lineNumber, ...)` - 创建订单行项

### 3. mod_AddNextNewRecord.bas 和 mod_EMP.bas 修改

**变更**：
- 添加详细的 JSDoc 注释文档
- 更新逻辑流程，在 AddHyperlink 之前初始化数据库，调用后关闭连接
- 确保数据库锁不会干扰后续的 AddNewJobToDB 操作

### 4. mod_PublicData.bas 更新

**变更**：
- DB_PATH 常量从 `C:\Users\ee\manufacturing_process_schedule\oe\jobs.db` 更改为
- `D:\work\Record Tech\job_management\data\record.db`

### 5. mod_ExportCanduOrders.bas 新建

**功能**：
- 从 DELIVERY SCHEDULE 筛选客户名称包含 "Candu" 的所有订单
- 导出为 CSV 格式（包含时间戳的文件名）
- 文件保存到项目的 `data` 文件夹
- 包含表头行和正确的 CSV 转义处理

**核心函数**：
- `ExportCanduOrders()` - 主导出函数
- `BuildHeaderRow(ws, colCount)` - 构建 CSV 表头
- `BuildDataRow(ws, rowNum, colCount)` - 构建 CSV 数据行

---

## 🔧 技术要点

### 数据库架构对比

| 方面 | 旧数据库 (jobs.db) | 新数据库 (record.db) |
|------|-------------------|-------------------|
| 结构 | 单表 `jobs` | 5 表关系：customer, customer_contact, purchase_order, job, order_item, part |
| 扩展性 | 低（所有字段混在一起） | 高（规范化设计） |
| 数据完整性 | 无外键约束 | 有外键关系 |
| 查询灵活性 | 低 | 高 |

### 三阶段超链接匹配逻辑

```
用户输入: drawing_number, po_number
    ↓
Phase 1: 精确查询
  part.drawing_number = ? 
    → drawing_file.part_id = ?
    → 返回 is_active=1 的文件 ✓
    ↓ 若无结果
Phase 2: 模糊查询
  drawing_file LIKE '%drawing_number%'
    → 检查 is_active 状态
    → 若恰好 1 个 active，返回 ✓
    ↓ 若多个
Phase 3: PO 验证
  检查 file_path 是否包含 po_number
    → 返回最新修改的文件 ✓
    → 若无 PO 匹配
  返回整体最新修改的文件 ✓
```

### 级联插入流程

```
用户提交表单
    ↓
FindOrCreateCustomer (customer)
    ↓
FindOrCreateCustomerContact (customer_contact)
    ↓
FindOrCreatePurchaseOrder (purchase_order)
    ↓
FindOrCreateJob (job)
    ↓
FindOrCreatePart (part, optional)
    ↓
CreateOrderItem (order_item) ← 插入订单行项
    ↓
更新 DELIVERY SCHEDULE 表单
    ↓
添加超链接 (AddHyperlink)
    ↓
导出 Candu 订单 (if 客户 = Candu)
```

---

## 🚀 使用方式

### 添加新订单的完整流程

1. **打开 Input Form 表单**：点击 "Create A New Job" 按钮
2. **填写表单数据**：输入 OE, 客户, 件号, PO 等信息
3. **添加记录**：
   - 点击 "Add Next New Record" 或 "EMT" 按钮
   - 系统自动：
     - 将数据复制到 DELIVERY SCHEDULE
     - 创建超链接到 drawing file
     - 级联插入到 record.db 的多个表
     - 若客户是 Candu，自动导出到 CSV
4. **确认完成**：弹出成功消息，显示导出文件路径（如适用）

### 导出 Candu 订单（手动调用）

在 VBA 编辑器中直接运行：
```vba
ExportCanduOrders
```

或从 Excel 功能区添加宏按钮调用

---

## ⚠️ 未来注意事项

本次重写基于 record.db 新数据库架构，所有旧数据库 (jobs.db) 的引用已移除；后续如需修改超链接匹配逻辑或数据库关系，请参考 [scripts/migrations/](../scripts/migrations/) 文件夹中的迁移脚本以了解新表结构。
