# 提案: 数据库规范化与三范式重构

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

## 新数据库结构（符合三范式）

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

### 表结构设计（完善版）

#### 1. **customer** - 客户主表
- 消除 `jobs.customer_name` 的冗余
- 支持使用统计和排序

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
- `usage_count`: 该客户的订单数（每次创建订单时递增）
- `last_used`: 最后一次使用时间（创建或编辑订单时更新）

---

#### 2. **customer_contact** - 联系人表
- 一对多关系：一个客户可以有多个联系人
- 消除 `jobs.customer_contact` 的重复

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

**说明**:
- `customer_id`: 外键，链接到客户表
- `contact_email`: 可选字段，支持未来的邮件通知功能
- 同样支持使用统计

---

#### 3. **purchase_order** - 采购订单表
- 原 `jobs.po_number` 和 `jobs.oe_number` 的规范化
- 管理订单的生命周期和状态

```sql
CREATE TABLE purchase_order (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_number TEXT NOT NULL UNIQUE,
  oe_number TEXT,
  contact_id INTEGER NOT NULL,
  is_active INTEGER DEFAULT 1,  -- 1: 活跃, 0: 已归档
  closed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (contact_id) REFERENCES customer_contact(id)
);
```

**设计考量**:
- `po_number`: 唯一约束，外部采购订单号
- `oe_number`: 原始设备制造商号码（可选）
- `is_active`: 标记订单是否仍在处理中
- `closed_at`: 订单完成时间（当 `is_active=0` 时设置）

---

#### 4. **job** - 作业表（核心）
- 简化后的作业表，仅保留与订单和优先级相关的字段
- 消除冗余，保留关键信息

```sql
CREATE TABLE job (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_number TEXT NOT NULL UNIQUE,
  po_id INTEGER NOT NULL,
  priority TEXT DEFAULT 'Normal',  -- Critical|Urgent|Important|Normal|Minor|Hold
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (po_id) REFERENCES purchase_order(id) ON DELETE CASCADE
);
```

**说明**:
- `job_number`: 唯一的作业号（原 unique_key 的主要部分）
- `po_id`: 外键，链接到采购订单
- `priority`: 标准优先级枚举

---

#### 5. **order_item** - 订单明细表
- 原 `jobs` 表的零件相关字段归纳
- 支持一个订单包含多个零件/行项目

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

**关键改进**:
- `production_hour`, `administrative_hour`: 独立字段追踪生产和行政时间
- `status`: 详细的状态追踪
- `UNIQUE(job_id, line_number)`: 确保同一作业内行号唯一

---

#### 6. **part** - 零件主表
- 统一管理所有零件和装配体定义
- 支持版本管理（previous_id）

```sql
CREATE TABLE part (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  previous_id INTEGER,
  drawing_number TEXT NOT NULL,
  revision TEXT NOT NULL DEFAULT '-',
  description TEXT,
  is_assembly INTEGER DEFAULT 0,  -- 1: 装配体, 0: 单零件
  production_count INTEGER DEFAULT 0,      -- 该零件被生产的总次数
  total_production_hour REAL DEFAULT 0,    -- 累计生产时间
  total_administrative_hour REAL DEFAULT 0, -- 累计行政时间
  unit_price REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (previous_id) REFERENCES part(id),
  UNIQUE(drawing_number, revision)  -- drawing_number + revision 唯一
);
```

**说明**:
- `previous_id`: 支持零件版本链（v1 → v2 → v3）
- `production_count`: 统计该零件被使用的次数，便于排序常用零件
- `total_production_hour`, `total_administrative_hour`: 累计时间统计

---

#### 7. **part_tree** - BOM 表（零件组成关系）
- 描述装配体与其子零件的关系
- 支持多级 BOM

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
  UNIQUE(parent_id, child_id)  -- 防止重复的父子关系
);
```

**设计考量**:
- 自引用外键，支持任意深度的 BOM 层级
- `UNIQUE(parent_id, child_id)`: 防止重复关系

---

#### 8. **shipment** - 发货单表
- 管理发货记录和发票信息
- 原 `jobs.packing_slip` 和 `jobs.invoice_number` 的规范化

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

**说明**:
- 一个发货单可以包含多个订单明细项

---

#### 9. **shipment_item** - 发货明细表
- 链接 `order_item` 和 `shipment` 的中间表
- 支持分批发货

```sql
CREATE TABLE shipment_item (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_item_id INTEGER NOT NULL,
  shipment_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,  -- 本次发货数量
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (order_item_id) REFERENCES order_item(id),
  FOREIGN KEY (shipment_id) REFERENCES shipment(id) ON DELETE CASCADE,
  UNIQUE(order_item_id, shipment_id)  -- 同一订单明细不重复发货
);
```

---

#### 10. **part_attachment** - 零件附件表
- 管理与零件相关的文件（图纸、检验报告、偏差单等）

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
  FOREIGN KEY (part_id) REFERENCES part(id),
  FOREIGN KEY (order_item_id) REFERENCES order_item(id) ON DELETE SET NULL
);
```

**设计考量**:
- 同时支持零件级和订单明细级的附件
- `file_type`: 规范化文件类型，便于筛选和分类
- `is_active`: 标记是否是有效/最新版本

---

#### 11. **drawing_file** - 图纸文件表
- 管理零件的图纸文件版本
- 原 `drawings` 表的升级版本

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

#### 12. **folder_mapping** - 客户文件夹映射表
- 原 `customer_folder_map` 的升级版本
- 将客户与文件系统文件夹关联

```sql
CREATE TABLE folder_mapping (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  folder_name TEXT NOT NULL,
  is_verified INTEGER DEFAULT 0,  -- 1: 已验证路径存在, 0: 未验证
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE,
  UNIQUE(customer_id, folder_name)  -- 同一客户的文件夹唯一
);
```

---

#### 13. **process_template** - 工艺模板表
- 定义零件的生产工艺步骤
- 从生产文档（如 Excel）中提取

```sql
CREATE TABLE process_template (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_id INTEGER NOT NULL,
  row_number INTEGER NOT NULL,
  shop_code TEXT NOT NULL,        -- 如 TURN, MILL, DRILL 等
  description TEXT,
  remark TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (part_id) REFERENCES part(id) ON DELETE CASCADE,
  UNIQUE(part_id, row_number)  -- 同一零件的行号唯一
);
```

---

#### 14. **step_tracker** - 步骤跟踪表
- 记录生产过程中的每一步操作
- 支持条码扫描集成

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

#### 15. **note** - 通用备注表
- 为任何实体（订单、零件、订单明细、发货等）添加备注
- 采用多态关联设计

```sql
CREATE TABLE note (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 关联维度：仅填一个
  po_id INTEGER,
  part_id INTEGER,
  job_id INTEGER,
  order_item_id INTEGER,
  shipment_id INTEGER,
  attachment_id INTEGER,
  
  content TEXT NOT NULL,
  author TEXT,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  
  FOREIGN KEY (po_id) REFERENCES purchase_order(id) ON DELETE CASCADE,
  FOREIGN KEY (part_id) REFERENCES part(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES job(id) ON DELETE CASCADE,
  FOREIGN KEY (order_item_id) REFERENCES order_item(id) ON DELETE CASCADE,
  FOREIGN KEY (shipment_id) REFERENCES shipment(id) ON DELETE CASCADE,
  FOREIGN KEY (attachment_id) REFERENCES part_attachment(id) ON DELETE CASCADE
);
```

**设计考量**:
- 多对一关系：一条备注只能关联一个实体
- 支持在整个系统中添加灵活的业务备注

---

## 符合三范式的验证

✅ **第一范式 (1NF)**: 所有字段都是原子值，无重复组
- 消除了 `jobs` 表中的冗余字段（多个地址、联系人等）
- 每个表字段都是独立的原子值

✅ **第二范式 (2NF)**: 所有非主键属性都完全依赖于主键
- 所有表都有明确的主键
- 非主键属性不存在对主键的部分依赖

✅ **第三范式 (3NF)**: 非主键属性之间没有传递依赖
- 消除了间接依赖关系
- 例如：`customer_name` 现在直接在 `customer` 表中，而不是通过 `job` 间接存储

## 主要改进点

| 问题 | 原结构 | 新结构 |
|------|--------|--------|
| 客户数据冗余 | 在 `jobs` 中重复存储 | 独立 `customer` 表 |
| 联系人管理 | 字符串 `customer_contact` | 独立 `customer_contact` 表，支持多人 |
| 数据一致性 | 无外键约束 | 完整外键约束，CASCADE 删除 |
| 订单管理 | 混在 `jobs` 中 | 独立 `purchase_order` 表 |
| 零件管理 | 简单字段 | 完整 `part` 表，支持版本管理 |
| BOM 关系 | 不支持 | `part_tree` 自引用支持多级 BOM |
| 附件管理 | 文件路径硬编码 | `part_attachment` 和 `drawing_file` 规范化 |
| 发货管理 | 简单字段 | 独立 `shipment` 和 `shipment_item` 表 |
| 生产追踪 | 不支持 | `process_template` 和 `step_tracker` 全流程 |
| 备注系统 | 无 | `note` 通用备注表 |

## 后续应用改造

新数据库实施后，需要：
1. 更新所有 API 路由以适配新结构
2. 重写前端组件的数据查询逻辑
3. 实现新的业务流程（如工艺模板、步骤追踪等）
4. 迁移历史数据至新结构（另行设计 ETL 流程）

---

## 准备就绪

该提案包含 15 个规范化表，完全符合三范式，并为未来的生产管理功能提供了坚实的基础。

请审核并确认：
1. 表结构是否符合需求
2. 是否需要调整字段或添加新列
3. 是否同意从头建立新数据源
