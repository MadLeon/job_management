# 数据库结构文档

**最后更新**: 2025-01-06  
**数据库名称**: jobs.db  
**类型**: SQLite 3  
**总表数**: 21 个

---

## 📋 数据库概览

该数据库实现了一个**完全规范化的三范式 (3NF)** 设计，支持制造业工作管理的完整生命周期，包括客户管理、订单管理、生产追踪、发货管理和文档管理。

### 核心价值
- ✅ **消除冗余**: 客户、联系人、订单等信息独立存储
- ✅ **完整约束**: 使用外键强制引用完整性
- ✅ **版本管理**: 支持零件多版本链
- ✅ **灵活备注**: 多个实体类型的专用备注表
- ✅ **使用统计**: 自动追踪客户和联系人使用情况

---

## 📊 表结构详解

### 第一部分: 核心业务表 (14 个)

---

#### 1️⃣ **customer** - 客户主表

存储所有客户信息，是整个系统的最上层实体。

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

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 客户唯一标识符，自增 |
| `customer_name` | TEXT | NOT NULL UNIQUE | 客户名称，全局唯一，用于显示和查询 |
| `usage_count` | INTEGER | DEFAULT 0 | 该客户的订单总数，自动更新 |
| `last_used` | TEXT | 可为 NULL | 最后一次使用时间，ISO 8601 格式 |
| `created_at` | TEXT | NOT NULL | 记录创建时间，自动填充 |
| `updated_at` | TEXT | NOT NULL | 记录最后更新时间，自动更新 |

**业务规则**:
- `customer_name` 必须唯一，防止重复客户名
- `usage_count` 在每次创建新订单时递增
- `last_used` 在每次引用该客户时更新

**示例数据**:
```
id=1, customer_name='AB Sciex', usage_count=5, last_used='2025-01-01 10:30:00'
```

---

#### 2️⃣ **customer_contact** - 联系人表

存储客户的联系人信息。一个客户可以有多个联系人。

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

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 联系人唯一标识符 |
| `customer_id` | INTEGER | NOT NULL FK | 关联的客户 ID，删除客户时联系人一并删除 |
| `contact_name` | TEXT | NOT NULL | 联系人名字 |
| `contact_email` | TEXT | 可为 NULL | 联系人邮箱 |
| `usage_count` | INTEGER | DEFAULT 0 | 该联系人被使用的次数 |
| `last_used` | TEXT | 可为 NULL | 最后使用时间 |
| `created_at` | TEXT | NOT NULL | 记录创建时间 |
| `updated_at` | TEXT | NOT NULL | 记录最后更新时间 |

**外键关系**:
- `customer_id` → `customer.id` (ON DELETE CASCADE)
  - 当删除客户时，该客户的所有联系人自动删除

**业务规则**:
- 一个客户可以有多个联系人
- 联系人只能属于一个客户
- 删除客户时自动清理相关联系人

---

#### 3️⃣ **purchase_order** - 采购订单表

采购订单是与客户之间的协议，可能关联到一个特定的联系人。

```sql
CREATE TABLE purchase_order (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    po_number TEXT NOT NULL UNIQUE,
    oe_number TEXT,
    contact_id INTEGER,
    is_active INTEGER DEFAULT 1,
    closed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (contact_id) REFERENCES customer_contact(id) ON DELETE SET NULL
);
```

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 订单唯一标识符 |
| `po_number` | TEXT | NOT NULL UNIQUE | 采购订单号，唯一标识 |
| `oe_number` | TEXT | 可为 NULL | 原始设备制造商订单号 |
| `contact_id` | INTEGER | 可为 NULL FK | 指定的联系人（可选），删除时设为 NULL |
| `is_active` | INTEGER | DEFAULT 1 | 订单状态：1=活跃，0=已关闭 |
| `closed_at` | TEXT | 可为 NULL | 订单关闭时间 |
| `created_at` | TEXT | NOT NULL | 订单创建时间 |
| `updated_at` | TEXT | NOT NULL | 订单最后更新时间 |

**外键关系**:
- `contact_id` → `customer_contact.id` (ON DELETE SET NULL)
  - 当删除联系人时，订单的 contact_id 被设为 NULL（保留订单）

**业务规则**:
- `po_number` 必须唯一
- `contact_id` 可选，订单可以没有指定的联系人
- 订单关闭后仍保留记录（用于历史追踪）

**示例数据**:
```
id=1, po_number='PO12345', oe_number='OE67890', contact_id=1, is_active=1
```

---

#### 4️⃣ **job** - 作业表

一个采购订单可以包含多个作业，每个作业对应一个生产任务。

```sql
CREATE TABLE job (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_number TEXT UNIQUE NOT NULL,
    po_id INTEGER NOT NULL,
    priority TEXT DEFAULT 'Normal',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (po_id) REFERENCES purchase_order(id) ON DELETE CASCADE
);
```

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 作业唯一标识符 |
| `job_number` | TEXT | UNIQUE NOT NULL | 作业号，全局唯一 |
| `po_id` | INTEGER | NOT NULL FK | 所属采购订单 |
| `priority` | TEXT | DEFAULT 'Normal' | 优先级：Critical\|Urgent\|Important\|Normal\|Minor\|Hold |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 最后更新时间 |

**外键关系**:
- `po_id` → `purchase_order.id` (ON DELETE CASCADE)
  - 删除订单时自动删除相关作业

**业务规则**:
- `job_number` 全局唯一，用于标识作业
- 一个订单可以有多个作业
- 优先级用于工作排序

---

#### 5️⃣ **order_item** - 订单明细表

表示作业中的一个具体的生产明细项，包含零件和数量信息。

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
  status TEXT DEFAULT 'PENDING',
  drawing_release_date TEXT,
  delivery_required_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (job_id) REFERENCES job(id) ON DELETE CASCADE,
  FOREIGN KEY (part_id) REFERENCES part(id),
  UNIQUE(job_id, line_number)
);
```

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 明细项唯一标识符 |
| `job_id` | INTEGER | NOT NULL FK | 所属作业 |
| `part_id` | INTEGER | NOT NULL FK | 零件 ID |
| `line_number` | INTEGER | NOT NULL | 行号（同作业内唯一） |
| `quantity` | INTEGER | DEFAULT 0 | 生产数量 |
| `actual_price` | REAL | 可为 NULL | 实际单价 |
| `production_hour` | REAL | DEFAULT 0 | 生产工时 |
| `administrative_hour` | REAL | DEFAULT 0 | 行政工时 |
| `status` | TEXT | DEFAULT 'PENDING' | 状态：PENDING\|IN_PROGRESS\|COMPLETED\|HOLD\|CANCELLED |
| `drawing_release_date` | TEXT | YYYY-MM-DD | 图纸发布日期 |
| `delivery_required_date` | TEXT | YYYY-MM-DD | 所需交货日期 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 最后更新时间 |

**外键关系**:
- `job_id` → `job.id` (ON DELETE CASCADE)
  - 删除作业时自动删除所有明细项
- `part_id` → `part.id`
  - 保留零件（可能用于其他订单）

**唯一约束**:
- `UNIQUE(job_id, line_number)` - 同一作业内行号不重复

**业务规则**:
- 一个作业可以有多个行号（多个零件）
- 同一行号可能重复出现在不同作业中
- 状态追踪整个生产过程

---

#### 6️⃣ **part** - 零件主表

存储零件定义，包括图纸号、修订版本和生产统计。

```sql
CREATE TABLE part (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  previous_id INTEGER,
  next_id INTEGER,
  drawing_number TEXT NOT NULL,
  revision TEXT NOT NULL DEFAULT '-',
  description TEXT,
  is_assembly INTEGER DEFAULT 0,
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

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 零件唯一标识符 |
| `previous_id` | INTEGER | 可为 NULL FK | 指向上一个版本 |
| `next_id` | INTEGER | 可为 NULL FK | 指向下一个版本 |
| `drawing_number` | TEXT | NOT NULL | 图纸号（非唯一，因为有多个版本） |
| `revision` | TEXT | NOT NULL | 版本号（如 A, B, C） |
| `description` | TEXT | 可为 NULL | 零件描述 |
| `is_assembly` | INTEGER | DEFAULT 0 | 是否为装配体：0=单零件，1=装配体 |
| `production_count` | INTEGER | DEFAULT 0 | 该零件的生产次数 |
| `total_production_hour` | REAL | DEFAULT 0 | 总生产工时 |
| `total_administrative_hour` | REAL | DEFAULT 0 | 总行政工时 |
| `unit_price` | REAL | DEFAULT 0 | 单位价格 |
| `created_at` | TEXT | NOT NULL | 记录创建时间 |
| `updated_at` | TEXT | NOT NULL | 记录最后更新时间 |

**外键关系（自引用）**:
- `previous_id` → `part.id` (ON DELETE SET NULL)
  - 指向版本链的前一个版本
- `next_id` → `part.id` (ON DELETE SET NULL)
  - 指向版本链的后一个版本

**唯一约束**:
- `UNIQUE(drawing_number, revision)` - 同一图纸号的版本唯一

**版本链示例**:
```
part#1: drawing='A100', revision='A', previous_id=NULL, next_id=2
  ↓
part#2: drawing='A100', revision='B', previous_id=1, next_id=3
  ↓
part#3: drawing='A100', revision='C', previous_id=2, next_id=NULL (最新)
```

**业务规则**:
- 同一图纸的不同修订版本形成版本链
- `next_id` 可快速查询最新版本
- 装配体可以包含子零件（通过 part_tree）

---

#### 7️⃣ **part_tree** - BOM 表

实现零件的分层结构（Bill of Materials），支持多级装配。

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

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | BOM 项唯一标识符 |
| `parent_id` | INTEGER | NOT NULL FK | 父零件 ID |
| `child_id` | INTEGER | NOT NULL FK | 子零件 ID |
| `quantity` | INTEGER | DEFAULT 1 | 该子零件的数量 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 最后更新时间 |

**外键关系（自引用）**:
- `parent_id` → `part.id` (ON DELETE CASCADE)
  - 删除父零件时自动删除 BOM 项
- `child_id` → `part.id`
  - 删除子零件时保留 BOM 项（可能其他装配使用）

**唯一约束**:
- `UNIQUE(parent_id, child_id)` - 每个父子关系唯一

**BOM 示例**:
```
装配体 A100:
  ├─ 零件 A101 (数量: 2)
  ├─ 零件 A102 (数量: 1)
  └─ 子装配体 A200:
      ├─ 零件 A201 (数量: 3)
      └─ 零件 A202 (数量: 1)
```

---

#### 8️⃣ **shipment** - 发货单表

存储发货（打包及发运）的基本信息。

```sql
CREATE TABLE shipment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  packing_slip_number TEXT UNIQUE NOT NULL,
  invoice_number TEXT UNIQUE,
  delivery_shipped_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
```

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 发货单唯一标识符 |
| `packing_slip_number` | TEXT | UNIQUE NOT NULL | 装箱单号，唯一标识 |
| `invoice_number` | TEXT | UNIQUE | 发票号（可能为空） |
| `delivery_shipped_date` | TEXT | YYYY-MM-DD | 发货日期 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 最后更新时间 |

**业务规则**:
- `packing_slip_number` 全局唯一
- 一个发货单可能关联多个订单明细项（通过 shipment_item）
- 可分批发货同一订单

---

#### 9️⃣ **shipment_item** - 发货明细表

关联发货单与订单明细项，记录分批发货。

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

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 发货明细唯一标识符 |
| `order_item_id` | INTEGER | NOT NULL FK | 订单明细项 |
| `shipment_id` | INTEGER | NOT NULL FK | 发货单 |
| `quantity` | INTEGER | DEFAULT 0 | 本次发货数量 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 最后更新时间 |

**外键关系**:
- `order_item_id` → `order_item.id`
- `shipment_id` → `shipment.id` (ON DELETE CASCADE)

**唯一约束**:
- `UNIQUE(order_item_id, shipment_id)` - 防止重复关联

**业务规则**:
- 一个订单明细项可以分多次发货
- 每次发货记录数量

---

#### 🔟 **part_attachment** - 零件附件表

存储与零件或订单明细关联的文件（图纸、检测报告等）。

```sql
CREATE TABLE part_attachment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_id INTEGER,
  order_item_id INTEGER,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  is_active INTEGER DEFAULT 1,
  last_modified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (part_id) REFERENCES part(id) ON DELETE CASCADE,
  FOREIGN KEY (order_item_id) REFERENCES order_item(id) ON DELETE CASCADE,
  CHECK (part_id IS NOT NULL OR order_item_id IS NOT NULL)
);
```

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 附件唯一标识符 |
| `part_id` | INTEGER | 可为 NULL FK | 关联的零件（如：PDF 图纸） |
| `order_item_id` | INTEGER | 可为 NULL FK | 关联的订单明细项（如：质检报告） |
| `file_type` | TEXT | NOT NULL | 文件类型：DRAWING\|INSPECTION\|MTR\|DEVIATION\|OTHER |
| `file_name` | TEXT | NOT NULL | 文件名 |
| `file_path` | TEXT | UNIQUE NOT NULL | 文件系统路径 |
| `is_active` | INTEGER | DEFAULT 1 | 是否有效：1=有效，0=已删除 |
| `last_modified_at` | TEXT | YYYY-MM-DD HH:MM:SS | 文件最后修改时间 |
| `created_at` | TEXT | NOT NULL | 记录创建时间 |
| `updated_at` | TEXT | NOT NULL | 记录最后更新时间 |

**外键关系**:
- `part_id` → `part.id` (ON DELETE CASCADE)
  - 删除零件时删除相关附件
- `order_item_id` → `order_item.id` (ON DELETE CASCADE)
  - 删除订单明细时删除相关附件

**CHECK 约束**:
- `CHECK (part_id IS NOT NULL OR order_item_id IS NOT NULL)`
- 确保附件至少关联到 part 或 order_item 之一

**文件类型说明**:
- `DRAWING` - PDF 图纸（通常只关联 part）
- `INSPECTION` - 质检报告（关联 order_item）
- `MTR` - 材料测试报告
- `DEVIATION` - 偏差报告
- `OTHER` - 其他文件

---

#### 1️⃣1️⃣ **drawing_file** - 图纸文件表

存储与零件关联的图纸文件的版本历史。

```sql
CREATE TABLE drawing_file (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    is_active INTEGER DEFAULT 1,
    last_modified_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (part_id) REFERENCES part(id) ON DELETE CASCADE
);
```

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 图纸文件唯一标识符 |
| `part_id` | INTEGER | NOT NULL FK | 关联的零件 |
| `file_name` | TEXT | NOT NULL | 图纸文件名 |
| `file_path` | TEXT | UNIQUE NOT NULL | 文件系统路径 |
| `is_active` | INTEGER | DEFAULT 1 | 是否为当前版本：1=是，0=历史版本 |
| `last_modified_at` | TEXT | YYYY-MM-DD HH:MM:SS | 文件最后修改时间 |
| `created_at` | TEXT | NOT NULL | 记录创建时间 |
| `updated_at` | TEXT | NOT NULL | 记录最后更新时间 |

**业务规则**:
- 一个零件可以有多个图纸文件版本
- `is_active` 标记当前版本
- 保留历史版本用于追踪

---

#### 1️⃣2️⃣ **folder_mapping** - 客户文件夹映射表

映射客户名称到文件系统中的实际文件夹。

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

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 映射唯一标识符 |
| `customer_id` | INTEGER | NOT NULL FK | 客户 |
| `folder_name` | TEXT | NOT NULL | 文件系统中的文件夹名称 |
| `is_verified` | INTEGER | DEFAULT 0 | 是否已验证：1=已验证，0=待验证 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 最后更新时间 |

**唯一约束**:
- `UNIQUE(customer_id, folder_name)` - 每个客户的每个文件夹唯一

---

#### 1️⃣3️⃣ **process_template** - 工艺模板表

定义零件的生产工艺步骤模板。

```sql
CREATE TABLE process_template (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_id INTEGER NOT NULL,
  row_number INTEGER NOT NULL,
  shop_code TEXT NOT NULL,
  description TEXT,
  remark TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (part_id) REFERENCES part(id) ON DELETE CASCADE,
  UNIQUE(part_id, row_number)
);
```

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 工艺步骤唯一标识符 |
| `part_id` | INTEGER | NOT NULL FK | 零件 |
| `row_number` | INTEGER | NOT NULL | 步骤顺序号 |
| `shop_code` | TEXT | NOT NULL | 工艺代码（如：TURN, MILL, DRILL） |
| `description` | TEXT | 可为 NULL | 工艺描述 |
| `remark` | TEXT | 可为 NULL | 备注 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 最后更新时间 |

**唯一约束**:
- `UNIQUE(part_id, row_number)` - 同一零件的步骤顺序号唯一

**工艺代码示例**:
- TURN - 车削
- MILL - 铣削
- DRILL - 钻孔
- BORE - 镗孔
- DEBURR - 去毛刺
- INSPECT - 检查

---

#### 1️⃣4️⃣ **step_tracker** - 步骤跟踪表

追踪每个订单明细项中每个工艺步骤的执行情况。

```sql
CREATE TABLE step_tracker (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_item_id INTEGER NOT NULL,
  process_template_id INTEGER NOT NULL,
  operator_id TEXT,
  machine_id TEXT,
  status TEXT DEFAULT 'PENDING',
  start_time TEXT,
  end_time TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (order_item_id) REFERENCES order_item(id) ON DELETE CASCADE,
  FOREIGN KEY (process_template_id) REFERENCES process_template(id)
);
```

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 步骤追踪记录唯一标识符 |
| `order_item_id` | INTEGER | NOT NULL FK | 订单明细项 |
| `process_template_id` | INTEGER | NOT NULL FK | 工艺步骤模板 |
| `operator_id` | TEXT | 可为 NULL | 操作员 ID |
| `machine_id` | TEXT | 可为 NULL | 机器 ID |
| `status` | TEXT | DEFAULT 'PENDING' | 状态：PENDING\|IN_PROGRESS\|COMPLETED\|FAILED\|HOLD |
| `start_time` | TEXT | ISO 8601 | 开始时间 |
| `end_time` | TEXT | ISO 8601 | 结束时间 |
| `created_at` | TEXT | NOT NULL | 记录创建时间 |
| `updated_at` | TEXT | NOT NULL | 记录最后更新时间 |

**业务规则**:
- 追踪每个订单明细在每个工艺步骤的进度
- 记录操作员和机器信息
- 支持实时进度更新

---

### 第二部分: 备注表组 (6 个)

这 6 个专用表取代了多态的单 `note` 表设计，提供更清晰的结构和更高效的查询。

---

#### 1️⃣5️⃣ **po_note** - 采购订单备注

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

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 备注唯一标识符 |
| `po_id` | INTEGER | NOT NULL FK | 采购订单 |
| `content` | TEXT | NOT NULL | 备注内容 |
| `author` | TEXT | 可为 NULL | 作者 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 最后更新时间 |

---

#### 1️⃣6️⃣ **job_note** - 作业备注

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

结构与 `po_note` 类似，用于记录作业相关的备注。

---

#### 1️⃣7️⃣ **order_item_note** - 订单明细备注

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

用于记录订单明细项的备注。

---

#### 1️⃣8️⃣ **part_note** - 零件备注

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

用于记录零件相关的备注和说明。

---

#### 1️⃣9️⃣ **shipment_note** - 发货备注

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

用于记录发货单的备注。

---

#### 2️⃣0️⃣ **attachment_note** - 附件备注

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

用于记录附件相关的备注。

---

---

## 🔗 核心关系图

```
customer (1)
    ↓ (N) customer_contact
            ↓ (N → 1) purchase_order
                        ↓ (N) job
                               ↓ (N) order_item
                                       ↓ (1) part
                                             ├─ (N) part_tree (BOM)
                                             ├─ (N) part_attachment
                                             ├─ (N) drawing_file
                                             ├─ (N) process_template
                                             └─ (N) part_note
                                       ├─ (N) shipment_item
                                       ├─ (N) order_item_note
                                       └─ (N) step_tracker

shipment (1)
    ↓ (N) shipment_item → order_item
    ↓ (N) shipment_note

part_attachment
    ├─ (N → 1 opt) part
    ├─ (N → 1 opt) order_item
    └─ (N) attachment_note

folder_mapping → customer
```

---

## ✅ 符合三范式验证

### 第一范式 (1NF) ✓
- 所有字段都是原子值（单值）
- 没有重复组或数组字段
- 每个值都是不可再分的基本数据类型

### 第二范式 (2NF) ✓
- 所有表都有主键
- 非主键属性完全依赖于主键，不存在部分依赖
- 例如：`order_item.line_number` 依赖于 `job_id + line_number` 的组合

### 第三范式 (3NF) ✓
- 非主键属性之间没有传递依赖
- 例如：`customer_name` 不在 `job` 表中，而在独立的 `customer` 表中
- 消除了间接的依赖关系

---

## 📊 数据约束总结

| 约束类型 | 详情 |
|---------|------|
| **PRIMARY KEY** | 所有表都有主键（自增 INTEGER） |
| **FOREIGN KEY** | 完整的外键约束，确保引用完整性 |
| **UNIQUE** | customer.customer_name, po_number, job_number, part.drawing_number+revision, 等 |
| **NOT NULL** | 关键字段标记为 NOT NULL |
| **DEFAULT** | 自动填充 created_at, updated_at 和状态字段的默认值 |
| **CHECK** | part_attachment (确保至少关联到 part 或 order_item) |
| **CASCADE DELETE** | 删除父记录时自动删除子记录 |
| **SET NULL** | 删除被引用记录时，外键设为 NULL（如 contact 被删除）  |

---

## 🔐 安全性考虑

1. **外键约束**: ON 状态强制引用完整性
2. **唯一约束**: 防止重复数据
3. **NOT NULL**: 关键字段必填
4. **CHECK 约束**: 业务规则验证
5. **CASCADE DELETE**: 自动清理孤立数据

---

## 📝 访问模式

### 数据库连接

所有 API 必须通过 `src/lib/db.js` 中的单例实例访问数据库。

```javascript
import getDB from '@/lib/db';
const db = getDB();
```

### 查询示例

```sql
-- 获取客户及其订单
SELECT c.*, p.po_number, j.job_number
FROM customer c
LEFT JOIN customer_contact cc ON c.id = cc.customer_id
LEFT JOIN purchase_order p ON cc.id = p.contact_id
LEFT JOIN job j ON p.id = j.po_id;

-- 获取订单的完整生产进度
SELECT j.job_number, oi.line_number, p.drawing_number,
       st.status, st.operator_id, st.start_time
FROM job j
JOIN order_item oi ON j.id = oi.job_id
JOIN part p ON oi.part_id = p.id
LEFT JOIN step_tracker st ON oi.id = st.order_item_id
ORDER BY j.job_number, oi.line_number;

-- 获取零件的版本链
WITH RECURSIVE part_chain AS (
  SELECT * FROM part WHERE drawing_number = 'A100' AND previous_id IS NULL
  UNION ALL
  SELECT p.* FROM part p
  JOIN part_chain pc ON p.previous_id = pc.id
)
SELECT * FROM part_chain ORDER BY created_at;
```

---

## 🚀 性能优化建议

### 推荐的索引

```sql
-- 查询性能优化
CREATE INDEX idx_customer_name ON customer(customer_name);
CREATE INDEX idx_po_po_number ON purchase_order(po_number);
CREATE INDEX idx_job_job_number ON job(job_number);
CREATE INDEX idx_job_po_id ON job(po_id);
CREATE INDEX idx_order_item_job_id ON order_item(job_id);
CREATE INDEX idx_order_item_part_id ON order_item(part_id);
CREATE INDEX idx_part_drawing_number ON part(drawing_number);
CREATE INDEX idx_part_next_id ON part(next_id);
CREATE INDEX idx_shipment_item_order_item_id ON shipment_item(order_item_id);
CREATE INDEX idx_step_tracker_order_item_id ON step_tracker(order_item_id);
CREATE INDEX idx_attachment_part_id ON part_attachment(part_id);
CREATE INDEX idx_attachment_order_item_id ON part_attachment(order_item_id);
```

---

## 📋 维护说明

### 备份策略
- 定期备份 `jobs.db`
- 保留迁移脚本用于数据恢复
- 使用版本控制追踪 schema 变化

### 监控关键字段
- `customer.usage_count` - 确保自动更新
- `part.next_id` - 确保版本链完整
- 外键约束 - 定期检查孤立数据

### 清理策略
- 定期清理已删除标记的数据
- 归档已完成的订单到 job_history
- 清理过期的临时数据

---

**文档更新时间**: 2025-01-06  
**下一次审查**: 2025-02-06
