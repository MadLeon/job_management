# 提案: 数据库规范化与三范式重构（优化版）

## 概述

当前数据库结构存在显著的设计问题：
- **数据冗余严重**：客户名称、联系人、订单信息等在 `jobs` 表中直接存储，导致更新异常风险
- **缺乏外键约束**：无法确保引用完整性，数据关系不明确
- **字段杂乱**：不符合三范式，维护困难，扩展性差
- **难以维护**：客户、联系人、采购订单等关键实体缺乏独立表管理

## 目标

设计并实现一套**符合三范式的新数据库架构**，包括：
1. **独立实体表**：客户 (customer)、联系人 (customer_contact)、采购订单 (purchase_order) 等
2. **规范化关系**：通过外键建立清晰的一对多关系，消除数据冗余
3. **完整的审计字段**：所有表统一包含 `created_at` 和 `updated_at`
4. **使用统计**：支持客户和联系人的使用计数和最后使用时间追踪
5. **生产管理**：零件管理、BOM、附件、工艺模板、步骤跟踪等生产全流程
6. **灵活的备注系统**：支持在多个实体上添加备注

---

## 新数据库结构（符合三范式，已优化）

### 表数量与特点

**总表数**: **21 个**（优化后从原来的 15 个拆分）
- 14 个业务核心表
- 6 个备注专用表（拆分的 note 表）
- 1 个通用表

### 核心实体关系

```
customer (1) ──→ (N) customer_contact
                        ↓
                purchase_order (1) ──→ (N) job
                                              ↓
                                        order_item (1) ──→ (N) shipment_item
                                              ↓
                                            part (1) ──→ (N) part_attachment
                                              ↓
                                          part_tree (自引用)
```

---

## 详细表结构定义

### 1. **customer** - 客户主表

```sql
CREATE TABLE customer (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL UNIQUE,
  usage_count INTEGER DEFAULT 0,
  last_used TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
```

**关键字段说明**:
- `customer_name`: 唯一约束，规范化客户名称
- `usage_count`: 该客户的订单数（自动统计）
- `last_used`: 最后一次使用时间（自动更新）

---

### 2. **customer_contact** - 联系人表

```sql
CREATE TABLE customer_contact (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  usage_count INTEGER DEFAULT 0,
  last_used TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE
);
```

**关键改进**: 支持一个客户多个联系人，自动追踪使用统计

---

### 3. **purchase_order** - 采购订单表

```sql
CREATE TABLE purchase_order (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    po_number TEXT NOT NULL UNIQUE,
    oe_number TEXT,
    contact_id INTEGER,  -- ✅ 改为可选（订单不一定有指定联系人）
    is_active INTEGER DEFAULT 1,  -- 1: 活跃, 0: 已归档
    closed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (contact_id) REFERENCES customer_contact(id) ON DELETE SET NULL
);
```

**关键改进**: 
- `contact_id` 改为可选（基于用户反馈方案 A）
- 删除联系人时订单保留（ON DELETE SET NULL）

---

### 4. **job** - 作业表

```sql
CREATE TABLE job (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_number TEXT UNIQUE NOT NULL,
    po_id INTEGER NOT NULL,
    priority TEXT DEFAULT 'Normal',  -- Critical|Urgent|Important|Normal|Minor|Hold
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (po_id) REFERENCES purchase_order(id) ON DELETE CASCADE
);
```

**说明**: 
- 一个采购订单可以有多个作业（通过 order_item 按行号区分）
- job_number 与 order_item.line_number 配合使用

---

### 5. **order_item** - 订单明细表

```sql
CREATE TABLE order_item (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  part_id INTEGER NOT NULL,
  line_number INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  actual_price REAL,
  production_hour REAL DEFAULT 0,
  administrative_hour REAL DEFAULT 0,
  status TEXT DEFAULT 'PENDING',  -- PENDING|IN_PROGRESS|COMPLETED|HOLD|CANCELLED
  drawing_release_date TEXT,       -- YYYY-MM-DD
  delivery_required_date TEXT,     -- YYYY-MM-DD
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (job_id) REFERENCES job(id) ON DELETE CASCADE,
  FOREIGN KEY (part_id) REFERENCES part(id),
  UNIQUE(job_id, line_number)      -- 同一作业内行号唯一
);
```

**关键设计**: 
- `job_id` + `line_number` 组合唯一
- 一个 job 可以有多个 line_number

---

### 6. **part** - 零件主表（优化版）

```sql
CREATE TABLE part (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  previous_id INTEGER,  -- 指向上一个版本的 part
  next_id INTEGER,      -- ✅ 新增：指向下一个版本（便于快速查询最新版本）
  drawing_number TEXT NOT NULL,
  revision TEXT NOT NULL DEFAULT '-',
  description TEXT,
  is_assembly INTEGER DEFAULT 0,  -- 1: 装配体, 0: 单零件
  production_count INTEGER DEFAULT 0,
  total_production_hour REAL DEFAULT 0,
  total_administrative_hour REAL DEFAULT 0,
  unit_price REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (previous_id) REFERENCES part(id) ON DELETE SET NULL,
  FOREIGN KEY (next_id) REFERENCES part(id) ON DELETE SET NULL,
  UNIQUE(drawing_number, revision)
);
```

**关键改进**: 
- 添加 `next_id` 支持快速查询版本链的下一个版本
- 适应用户的业务模型（大量修改时制作新图而非修改 revision）

---

### 7. **part_tree** - BOM 表

```sql
CREATE TABLE part_tree (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER NOT NULL,
  child_id INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (parent_id) REFERENCES part(id) ON DELETE CASCADE,
  FOREIGN KEY (child_id) REFERENCES part(id),
  UNIQUE(parent_id, child_id)
);
```

**说明**: 自引用外键，支持多级 BOM

---

### 8. **shipment** - 发货单表

```sql
CREATE TABLE shipment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  packing_slip_number TEXT UNIQUE NOT NULL,
  invoice_number TEXT UNIQUE,
  delivery_shipped_date TEXT,  -- YYYY-MM-DD
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
```

---

### 9. **shipment_item** - 发货明细表

```sql
CREATE TABLE shipment_item (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_item_id INTEGER NOT NULL,
  shipment_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (order_item_id) REFERENCES order_item(id),
  FOREIGN KEY (shipment_id) REFERENCES shipment(id) ON DELETE CASCADE,
  UNIQUE(order_item_id, shipment_id)
);
```

---

### 10. **part_attachment** - 零件附件表（优化版）

```sql
CREATE TABLE part_attachment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_id INTEGER,
  order_item_id INTEGER,
  file_type TEXT NOT NULL,       -- DRAWING|INSPECTION|MTR|DEVIATION|OTHER
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  is_active INTEGER DEFAULT 1,
  last_modified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (part_id) REFERENCES part(id) ON DELETE CASCADE,
  FOREIGN KEY (order_item_id) REFERENCES order_item(id) ON DELETE CASCADE,
  -- ✅ 新增约束：附件必须关联 part 或 order_item 之一（或两者）
  -- 但 PDF 图纸只关联 part，质检报告等关联 order_item 或两者
  CHECK (part_id IS NOT NULL OR order_item_id IS NOT NULL)
);
```

**关键改进**: 
- 添加 CHECK 约束确保至少关联一个对象
- 支持 PDF 图纸（只关联 part）或质检报告（关联 order_item）

---

### 11. **drawing_file** - 图纸文件表

```sql
CREATE TABLE drawing_file (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    is_active INTEGER DEFAULT 1,  -- 1: 最新版本, 0: 历史版本
    last_modified_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (part_id) REFERENCES part(id) ON DELETE CASCADE
);
```

---

### 12. **folder_mapping** - 客户文件夹映射表

```sql
CREATE TABLE folder_mapping (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  folder_name TEXT NOT NULL,
  is_verified INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE,
  UNIQUE(customer_id, folder_name)
);
```

---

### 13. **process_template** - 工艺模板表

```sql
CREATE TABLE process_template (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_id INTEGER NOT NULL,
  row_number INTEGER NOT NULL,
  shop_code TEXT NOT NULL,        -- TURN, MILL, DRILL 等
  description TEXT,
  remark TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (part_id) REFERENCES part(id) ON DELETE CASCADE,
  UNIQUE(part_id, row_number)
);
```

---

### 14. **step_tracker** - 步骤跟踪表

```sql
CREATE TABLE step_tracker (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_item_id INTEGER NOT NULL,
  process_template_id INTEGER NOT NULL,
  operator_id TEXT,
  machine_id TEXT,
  status TEXT DEFAULT 'PENDING',  -- PENDING|IN_PROGRESS|COMPLETED|FAILED|HOLD
  start_time TEXT,                -- ISO 8601 时间戳
  end_time TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (order_item_id) REFERENCES order_item(id) ON DELETE CASCADE,
  FOREIGN KEY (process_template_id) REFERENCES process_template(id)
);
```

---

### 15-21. **备注表组** - 拆分的备注系统（优化版）

**设计改进**: 不再使用多态的单 note 表，而是为不同实体分别创建专用的备注表，提高查询效率和约束明确性

#### 15. **po_note** - 采购订单备注

```sql
CREATE TABLE po_note (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  author TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (po_id) REFERENCES purchase_order(id) ON DELETE CASCADE
);
```

#### 16. **job_note** - 作业备注

```sql
CREATE TABLE job_note (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  author TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (job_id) REFERENCES job(id) ON DELETE CASCADE
);
```

#### 17. **order_item_note** - 订单明细备注

```sql
CREATE TABLE order_item_note (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_item_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  author TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (order_item_id) REFERENCES order_item(id) ON DELETE CASCADE
);
```

#### 18. **part_note** - 零件备注

```sql
CREATE TABLE part_note (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  author TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (part_id) REFERENCES part(id) ON DELETE CASCADE
);
```

#### 19. **shipment_note** - 发货备注

```sql
CREATE TABLE shipment_note (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shipment_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  author TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (shipment_id) REFERENCES shipment(id) ON DELETE CASCADE
);
```

#### 20. **attachment_note** - 附件备注

```sql
CREATE TABLE attachment_note (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attachment_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  author TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (attachment_id) REFERENCES part_attachment(id) ON DELETE CASCADE
);
```

#### 21. **part_tree_note** - BOM 备注（可选）

```sql
CREATE TABLE part_tree_note (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_tree_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  author TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (part_tree_id) REFERENCES part_tree(id) ON DELETE CASCADE
);
```

---

## 符合三范式的验证

✅ **第一范式 (1NF)**: 所有字段都是原子值
- 消除了 `jobs` 表中的冗余字段（多个地址、联系人等）
- 每个表字段都是独立的原子值

✅ **第二范式 (2NF)**: 所有非主键属性都完全依赖于主键
- 所有表都有明确的主键
- 非主键属性不存在对主键的部分依赖

✅ **第三范式 (3NF)**: 非主键属性之间没有传递依赖
- 消除了间接依赖关系
- 例如：`customer_name` 现在直接在 `customer` 表中

---

## 关键设计决策总结

| 决策项 | 最终方案 | 理由 |
|--------|---------|------|
| contact_id 在 purchase_order 中 | NULL（可选） | 订单不一定有指定的联系人 |
| job 与 order_item 关系 | 一对多 | 一个 job 可以有多个 line_number |
| part 版本管理 | 添加 next_id | 支持快速查询版本链，适应大量修改的业务 |
| status 值定义 | 灵活定义 | 状态名仅为暂定，方便后续修改 |
| 时间戳字段 | 基础设计保持不变 | 维持 created_at 和 updated_at 即可 |
| part_attachment 关联 | 允许两个都为 NULL 之外的情况 | 支持多种文件类型关联方式 |
| note 表设计 | 拆分为 6 个专用表 | 提高查询效率，约束明确，易于扩展 |

---

## 主要改进点对比

| 问题 | 原设计 | 优化设计 | 改进 |
|------|--------|----------|------|
| contact_id 强制 | NOT NULL | NULL（可选） | 灵活性更高 |
| part 版本查询 | 只有 previous_id | previous_id + next_id | 查询更高效 |
| part_attachment 约束 | 无约束 | CHECK 约束 | 数据完整性更好 |
| note 表设计 | 单多态表 | 6 个专用表 | 查询清晰，易于扩展 |
| 总表数 | 15 个 | 21 个 | 功能更完整，关系更清晰 |

---

## 后续应用改造

新数据库实施后，需要：
1. 更新所有 API 路由以适配新结构
2. 重写前端组件的数据查询逻辑
3. 实现新的业务流程（如工艺模板、步骤追踪等）
4. 迁移历史数据至新结构（另行设计 ETL 流程）

---

## 准备就绪

该提案包含 21 个规范化表，完全符合三范式，已根据你的反馈进行了优化，并为未来的生产管理功能提供了坚实的基础。

✅ **所有核心决策已确认**，可以立即开始编写迁移脚本！
