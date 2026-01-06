# 详细设计文档: 数据库规范化重构

## 1. 数据库架构概览

### 1.1 整体设计原则

- **数据规范化**: 完全符合 ACID 三范式
- **引用完整性**: 使用外键约束确保数据一致性
- **灵活扩展**: 支持未来的功能扩展（如工作流、审批等）
- **审计追踪**: 所有表都包含 `created_at` 和 `updated_at` 字段
- **业务统计**: 支持使用计数、最后使用时间等统计功能

### 1.2 核心实体关系图

```
┌─────────────────────────────────────────────────────────────────────┐
│ 数据流向: 客户 → 联系人 → 采购订单 → 作业 → 订单明细 → 发货 → 零件 │
└─────────────────────────────────────────────────────────────────────┘

customer (客户主表)
  ├─ customer_contact (联系人，一客户对多人)
  │   └─ purchase_order (采购订单，一人对多订单)
  │       └─ job (作业，一订单对多作业)
  │           └─ order_item (订单明细，一作业对多项)
  │               ├─ part (零件，n:n 关系)
  │               ├─ shipment_item (发货明细)
  │               │   └─ shipment (发货单)
  │               └─ step_tracker (生产步骤)
  │
  ├─ folder_mapping (客户文件夹)
  │
  part (零件主表)
    ├─ part_tree (BOM，零件组成，自引用)
    ├─ part_attachment (零件附件)
    ├─ drawing_file (图纸文件)
    └─ process_template (工艺模板)
        └─ step_tracker (步骤跟踪)

note (通用备注表，可关联任何实体)
```

### 1.3 关键约束与索引

#### 主键约束
- 所有表都有 `id` 自增主键

#### 唯一约束
- `customer.customer_name`: 规范化客户名唯一
- `purchase_order.po_number`: 采购订单号唯一
- `purchase_order.invoice_number`: 发票号唯一
- `job.job_number`: 作业号唯一
- `order_item.job_id + line_number`: 同一作业内行号唯一
- `part.drawing_number + revision`: 零件唯一
- `part_tree.parent_id + child_id`: 父子关系唯一
- `shipment.packing_slip_number`: 装箱单号唯一
- `shipment_item.order_item_id + shipment_id`: 避免重复发货
- `drawing_file.file_path`: 文件路径唯一
- `process_template.part_id + row_number`: 同零件的工艺步骤行号唯一
- `folder_mapping.customer_id + folder_name`: 避免重复文件夹映射

#### 外键约束
所有外键均启用 `ON DELETE CASCADE` 或 `ON DELETE SET NULL`：
- 删除客户自动删除其联系人、文件夹映射
- 删除联系人自动删除相关采购订单
- 删除采购订单自动删除相关作业
- 删除作业自动删除订单明细
- 删除零件自动删除 BOM、附件、图纸文件、工艺模板
- 删除发货单自动删除发货明细

---

## 2. 表字段详解与业务含义

### 2.1 customer - 客户主表

**业务含义**: 统一管理所有客户信息，支持使用统计和频繁度排序

**字段说明**:

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AI | 主键，自增 |
| `customer_name` | TEXT | NOT NULL, UNIQUE | 规范化的客户名（唯一） |
| `usage_count` | INTEGER | DEFAULT 0 | 该客户的订单总数 |
| `last_used` | TEXT | NULL | 最后使用时间（ISO 8601） |
| `created_at` | TEXT | NOT NULL | 创建时间（系统自动） |
| `updated_at` | TEXT | NOT NULL | 最后修改时间（系统自动） |

**数据示例**:
```
id=1, customer_name='MHI-Canada', usage_count=5, last_used='2025-12-20 10:30:00'
```

**操作规则**:
- 创建采购订单时，检查/创建对应的客户记录，并递增 `usage_count`
- 更新采购订单时，更新对应客户的 `last_used` 字段
- 删除所有订单后，可选择保留或删除客户记录（业务决策）

---

### 2.2 customer_contact - 联系人表

**业务含义**: 管理一个客户的多个联系人，独立追踪每个联系人的使用统计

**字段说明**:

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AI | 主键 |
| `customer_id` | INTEGER | FK, NOT NULL | 外键指向 `customer.id` |
| `contact_name` | TEXT | NOT NULL | 联系人名字 |
| `contact_email` | TEXT | NULL | 邮箱地址（可选） |
| `usage_count` | INTEGER | DEFAULT 0 | 该联系人的订单数 |
| `last_used` | TEXT | NULL | 最后使用时间 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 最后修改时间 |

**数据示例**:
```
id=10, customer_id=1, contact_name='Lana Bozic', contact_email='lana@mhi.com'
```

---

### 2.3 purchase_order - 采购订单表

**业务含义**: 管理来自客户的采购订单，原 `po_number` 和 `oe_number` 的规范化

**字段说明**:

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AI | 主键 |
| `po_number` | TEXT | NOT NULL, UNIQUE | 采购订单号 |
| `oe_number` | TEXT | NULL | OEM 号（可选） |
| `contact_id` | INTEGER | FK, NOT NULL | 外键指向 `customer_contact.id` |
| `is_active` | INTEGER | DEFAULT 1 | 1=活跃, 0=已归档 |
| `closed_at` | TEXT | NULL | 订单关闭时间 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 最后修改时间 |

**操作规则**:
- `is_active=0` 且 `closed_at` 已设置时，订单为已完成/归档状态
- 创建订单时，同步更新 `customer.usage_count` 和 `last_used`
- 删除订单时级联删除所有相关作业

---

### 2.4 job - 作业表

**业务含义**: 一个采购订单可以分解为多个作业（按行号或优先级）

**字段说明**:

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AI | 主键 |
| `job_number` | TEXT | NOT NULL, UNIQUE | 作业号 |
| `po_id` | INTEGER | FK, NOT NULL | 外键指向 `purchase_order.id` |
| `priority` | TEXT | DEFAULT 'Normal' | 优先级（Critical\|Urgent\|Important\|Normal\|Minor\|Hold） |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 最后修改时间 |

**数据示例**:
```
id=1, job_number='69279', po_id=1, priority='Urgent'
```

---

### 2.5 order_item - 订单明细表

**业务含义**: 订单中的每一行项目，包含零件、数量、生产时间等

**字段说明**:

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AI | 主键 |
| `job_id` | INTEGER | FK, NOT NULL | 外键指向 `job.id` |
| `part_id` | INTEGER | FK, NOT NULL | 外键指向 `part.id` |
| `line_number` | INTEGER | NOT NULL | 行号（同一作业内递增） |
| `quantity` | INTEGER | DEFAULT 0 | 订单数量 |
| `actual_price` | REAL | NULL | 实际价格 |
| `production_hour` | REAL | DEFAULT 0 | 生产时间（小时） |
| `administrative_hour` | REAL | DEFAULT 0 | 行政时间（小时） |
| `status` | TEXT | DEFAULT 'PENDING' | 状态（PENDING\|IN_PROGRESS\|COMPLETED\|HOLD\|CANCELLED） |
| `drawing_release_date` | TEXT | NULL | 图纸发布日期（YYYY-MM-DD） |
| `delivery_required_date` | TEXT | NULL | 所需交货日期（YYYY-MM-DD） |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 最后修改时间 |
| 约束 | | UNIQUE(job_id, line_number) | 同一作业内行号唯一 |

**数据示例**:
```
id=1, job_id=1, part_id=5, line_number=1, quantity=40, status='IN_PROGRESS'
```

**操作规则**:
- 创建 order_item 时，同步递增 `part.production_count`
- 标记为 COMPLETED 时，同步更新 `part.total_production_hour` 和 `total_administrative_hour`

---

### 2.6 part - 零件主表

**业务含义**: 统一管理所有零件和装配体，支持版本管理和生产统计

**字段说明**:

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AI | 主键 |
| `previous_id` | INTEGER | FK, NULL | 外键指向 `part.id`（版本链） |
| `drawing_number` | TEXT | NOT NULL | 图纸号 |
| `revision` | TEXT | DEFAULT '-' | 版本号（A, B, C 等） |
| `description` | TEXT | NULL | 描述 |
| `is_assembly` | INTEGER | DEFAULT 0 | 1=装配体, 0=单零件 |
| `production_count` | INTEGER | DEFAULT 0 | 被生产的总次数 |
| `total_production_hour` | REAL | DEFAULT 0 | 累计生产时间 |
| `total_administrative_hour` | REAL | DEFAULT 0 | 累计行政时间 |
| `unit_price` | REAL | DEFAULT 0 | 单价 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 最后修改时间 |
| 约束 | | UNIQUE(drawing_number, revision) | drawing_number+revision 唯一 |

**数据示例**:
```
id=5, drawing_number='GM223-1314-9', revision='A', is_assembly=1, production_count=12
```

**版本管理示例**:
```
part_1: drawing_number='ABC-001', revision='A', previous_id=NULL
  ↓（修改后）
part_2: drawing_number='ABC-001', revision='B', previous_id=1
  ↓（修改后）
part_3: drawing_number='ABC-001', revision='C', previous_id=2
```

---

### 2.7 part_tree - BOM 表

**业务含义**: 描述装配体与其子零件的组成关系，支持多级 BOM

**字段说明**:

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AI | 主键 |
| `parent_id` | INTEGER | FK, NOT NULL | 外键指向 `part.id`（母零件） |
| `child_id` | INTEGER | FK, NOT NULL | 外键指向 `part.id`（子零件） |
| `quantity` | INTEGER | DEFAULT 1 | 子零件数量 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 最后修改时间 |
| 约束 | | UNIQUE(parent_id, child_id) | 避免重复关系 |

**数据示例**:
```
parent_id=5 (装配体), child_id=10 (螺钉), quantity=4
```

**多级 BOM 示例**:
```
装配体-A (id=1)
  ├─ 子装配体-B (id=2), qty=1
  │   ├─ 零件-C (id=3), qty=2
  │   └─ 零件-D (id=4), qty=3
  └─ 零件-E (id=5), qty=5
```

---

### 2.8 shipment - 发货单表

**业务含义**: 管理向客户发货的记录，原 `packing_slip` 和 `invoice_number` 的规范化

**字段说明**:

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AI | 主键 |
| `packing_slip_number` | TEXT | NOT NULL, UNIQUE | 装箱单号 |
| `invoice_number` | TEXT | NULL, UNIQUE | 发票号 |
| `delivery_shipped_date` | TEXT | NULL | 发货日期（YYYY-MM-DD） |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 最后修改时间 |

**数据示例**:
```
id=1, packing_slip_number='PS-2025-001', invoice_number='INV-2025-001'
```

---

### 2.9 shipment_item - 发货明细表

**业务含义**: 一个发货单中包含多个订单明细项

**字段说明**:

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AI | 主键 |
| `order_item_id` | INTEGER | FK, NOT NULL | 外键指向 `order_item.id` |
| `shipment_id` | INTEGER | FK, NOT NULL | 外键指向 `shipment.id` |
| `quantity` | INTEGER | DEFAULT 0 | 本次发货数量 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 最后修改时间 |
| 约束 | | UNIQUE(order_item_id, shipment_id) | 避免重复 |

**业务场景**:
```
order_item (订单明细): quantity=100
  ├─ shipment_item 1: quantity=50 (第一批)
  └─ shipment_item 2: quantity=50 (第二批)
```

---

### 2.10 part_attachment - 零件附件表

**业务含义**: 管理与零件相关的文件（图纸、检验报告、偏差单等）

**字段说明**:

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AI | 主键 |
| `part_id` | INTEGER | FK, NULL | 外键指向 `part.id` |
| `order_item_id` | INTEGER | FK, NULL, ON DELETE SET NULL | 外键指向 `order_item.id` |
| `file_type` | TEXT | NOT NULL | DRAWING\|INSPECTION\|MTR\|DEVIATION\|OTHER |
| `file_name` | TEXT | NOT NULL | 文件名 |
| `file_path` | TEXT | NOT NULL, UNIQUE | 完整文件路径 |
| `is_active` | INTEGER | DEFAULT 1 | 1=有效, 0=历史版本 |
| `last_modified_at` | TEXT | NULL | 文件最后修改时间 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 最后修改时间 |

**数据示例**:
```
id=1, part_id=5, file_type='DRAWING', file_name='GM223-1314-9-v2.pdf'
id=2, order_item_id=1, file_type='INSPECTION', file_name='inspection-report-2025.pdf'
```

---

### 2.11 drawing_file - 图纸文件表

**业务含义**: 管理零件的图纸文件版本，独立于 `part_attachment` 的专用表

**字段说明**:

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AI | 主键 |
| `part_id` | INTEGER | FK, NOT NULL | 外键指向 `part.id` |
| `file_name` | TEXT | NOT NULL | 文件名 |
| `file_path` | TEXT | NOT NULL, UNIQUE | 完整文件路径 |
| `is_active` | INTEGER | DEFAULT 1 | 1=最新版本, 0=历史版本 |
| `last_modified_at` | TEXT | NULL | 文件最后修改时间 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 最后修改时间 |

**数据示例**:
```
id=1, part_id=5, file_path='...\\MHI-Canada\\GM223-1314-9_v1.pdf', is_active=0
id=2, part_id=5, file_path='...\\MHI-Canada\\GM223-1314-9_v2.pdf', is_active=1
```

---

### 2.12 folder_mapping - 客户文件夹映射表

**业务含义**: 将客户名与文件系统文件夹关联，支持一客户多文件夹

**字段说明**:

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AI | 主键 |
| `customer_id` | INTEGER | FK, NOT NULL | 外键指向 `customer.id` |
| `folder_name` | TEXT | NOT NULL | 文件夹名或路径 |
| `is_verified` | INTEGER | DEFAULT 0 | 1=路径已验证存在, 0=未验证 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 最后修改时间 |
| 约束 | | UNIQUE(customer_id, folder_name) | 同客户的文件夹唯一 |

---

### 2.13 process_template - 工艺模板表

**业务含义**: 定义零件的生产工艺步骤（从生产文档提取）

**字段说明**:

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AI | 主键 |
| `part_id` | INTEGER | FK, NOT NULL | 外键指向 `part.id` |
| `row_number` | INTEGER | NOT NULL | 步骤行号 |
| `shop_code` | TEXT | NOT NULL | 工序代码（TURN, MILL, DRILL 等） |
| `description` | TEXT | NULL | 工序描述 |
| `remark` | TEXT | NULL | 备注 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 最后修改时间 |
| 约束 | | UNIQUE(part_id, row_number) | 同零件的行号唯一 |

**数据示例**:
```
part_id=5:
  row_number=1, shop_code='TURN', description='车削 φ20'
  row_number=2, shop_code='MILL', description='铣削平面'
  row_number=3, shop_code='DRILL', description='钻孔 φ6.5'
```

---

### 2.14 step_tracker - 步骤跟踪表

**业务含义**: 记录生产过程中每一步的执行情况（条码扫描集成）

**字段说明**:

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AI | 主键 |
| `order_item_id` | INTEGER | FK, NOT NULL | 外键指向 `order_item.id` |
| `process_template_id` | INTEGER | FK, NOT NULL | 外键指向 `process_template.id` |
| `operator_id` | TEXT | NULL | 操作员 ID/名字 |
| `machine_id` | TEXT | NULL | 机器 ID |
| `status` | TEXT | DEFAULT 'PENDING' | PENDING\|IN_PROGRESS\|COMPLETED\|FAILED\|HOLD |
| `start_time` | TEXT | NULL | 开始时间（ISO 8601） |
| `end_time` | TEXT | NULL | 结束时间（ISO 8601） |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 最后修改时间 |

**数据示例**:
```
order_item_id=1 (GM223-1314-9, qty=40):
  process_template_id=1 (TURN): status=COMPLETED, start_time=2025-12-20 08:00, end_time=2025-12-20 10:30
  process_template_id=2 (MILL): status=IN_PROGRESS, start_time=2025-12-20 10:45, operator_id='Carlos'
  process_template_id=3 (DRILL): status=PENDING
```

---

### 2.15 note - 通用备注表

**业务含义**: 为任何实体添加备注，采用多态关联设计

**字段说明**:

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AI | 主键 |
| `po_id` | INTEGER | FK, NULL, ON DELETE CASCADE | 关联采购订单 |
| `part_id` | INTEGER | FK, NULL, ON DELETE CASCADE | 关联零件 |
| `job_id` | INTEGER | FK, NULL, ON DELETE CASCADE | 关联作业 |
| `order_item_id` | INTEGER | FK, NULL, ON DELETE CASCADE | 关联订单明细 |
| `shipment_id` | INTEGER | FK, NULL, ON DELETE CASCADE | 关联发货单 |
| `attachment_id` | INTEGER | FK, NULL, ON DELETE CASCADE | 关联附件 |
| `content` | TEXT | NOT NULL | 备注内容 |
| `author` | TEXT | NULL | 备注作者 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 最后修改时间 |

**数据示例**:
```
1: po_id=1, content='该订单需要加急处理', author='Manager_A'
2: order_item_id=1, content='零件表面有轻微划伤，已确认可用', author='Quality'
3: part_id=5, content='该零件库存不足，需要补充', author='Warehouse'
```

---

## 3. 迁移策略

### 3.1 从旧数据库迁移

由于新旧结构差异巨大，建议：

1. **保留旧数据库**: 不删除原 `jobs` 表，仅用于参考和数据导出
2. **分步迁移**: 
   - 先创建新数据库所有表
   - 编写 ETL 脚本将旧数据映射到新表
   - 验证数据一致性
3. **业务决策**:
   - 如何处理 `job_history`（保留或删除？）
   - 是否需要 ID 映射表（旧 ID → 新 ID）

### 3.2 应用代码更新

新数据库实施后，需要逐步更新：
1. API 路由（`src/pages/api/`）
2. 组件和页面逻辑
3. React Query hooks（数据查询和缓存）
4. UI 表单和验证

---

## 4. 索引建议（性能优化）

建议创建以下索引以提高查询性能：

```sql
-- 外键索引（加速 JOIN）
CREATE INDEX idx_customer_contact_customer_id ON customer_contact(customer_id);
CREATE INDEX idx_purchase_order_contact_id ON purchase_order(contact_id);
CREATE INDEX idx_job_po_id ON job(po_id);
CREATE INDEX idx_order_item_job_id ON order_item(job_id);
CREATE INDEX idx_order_item_part_id ON order_item(part_id);
CREATE INDEX idx_part_tree_parent_id ON part_tree(parent_id);
CREATE INDEX idx_part_tree_child_id ON part_tree(child_id);
CREATE INDEX idx_shipment_item_order_item_id ON shipment_item(order_item_id);
CREATE INDEX idx_shipment_item_shipment_id ON shipment_item(shipment_id);
CREATE INDEX idx_part_attachment_part_id ON part_attachment(part_id);
CREATE INDEX idx_part_attachment_order_item_id ON part_attachment(order_item_id);
CREATE INDEX idx_drawing_file_part_id ON drawing_file(part_id);
CREATE INDEX idx_folder_mapping_customer_id ON folder_mapping(customer_id);
CREATE INDEX idx_process_template_part_id ON process_template(part_id);
CREATE INDEX idx_step_tracker_order_item_id ON step_tracker(order_item_id);
CREATE INDEX idx_step_tracker_process_template_id ON step_tracker(process_template_id);
CREATE INDEX idx_note_po_id ON note(po_id);
CREATE INDEX idx_note_part_id ON note(part_id);
CREATE INDEX idx_note_job_id ON note(job_id);
CREATE INDEX idx_note_order_item_id ON note(order_item_id);
CREATE INDEX idx_note_shipment_id ON note(shipment_id);
CREATE INDEX idx_note_attachment_id ON note(attachment_id);

-- 业务查询索引
CREATE INDEX idx_customer_usage_count ON customer(usage_count DESC);
CREATE INDEX idx_customer_last_used ON customer(last_used DESC);
CREATE INDEX idx_part_production_count ON part(production_count DESC);
CREATE INDEX idx_order_item_status ON order_item(status);
CREATE INDEX idx_order_item_delivery_required_date ON order_item(delivery_required_date);
CREATE INDEX idx_shipment_delivery_shipped_date ON shipment(delivery_shipped_date);
CREATE INDEX idx_step_tracker_status ON step_tracker(status);
```

---

## 5. 约束与验证规则

### 5.1 应用层验证

- **customer_name**: 非空，长度 1-255，去除首尾空格后检查唯一性
- **po_number**: 非空，格式验证（如 `^[A-Z0-9-]+$`）
- **job_number**: 非空，在系统中唯一
- **delivery_required_date**, **delivery_shipped_date**: ISO 8601 格式 (YYYY-MM-DD)
- **status 枚举**: 仅允许预定义的值

### 5.2 数据库约束

- **外键约束**: 所有外键启用，确保引用完整性
- **NOT NULL**: 关键字段均 NOT NULL
- **UNIQUE**: 关键字段（ID、号码等）均有唯一约束
- **CHECK**: 可选择添加检查约束（如状态值范围）

---

## 6. 时间戳与审计

所有表统一遵循以下规则：

1. **created_at**: 记录创建时间，**插入后不变**
2. **updated_at**: 记录最后修改时间，**每次更新时自动更新**
3. **closed_at**, **last_modified_at** 等特殊时间戳，根据业务需求设置

**SQLite 自动化方案**:
```sql
-- 在触发器中设置 updated_at
CREATE TRIGGER update_customer_timestamp
AFTER UPDATE ON customer
FOR EACH ROW
BEGIN
  UPDATE customer SET updated_at = datetime('now', 'localtime') WHERE id = NEW.id;
END;
```

---

## 7. 设计验证

### 符合三范式的证明

✅ **第一范式 (1NF)**: 所有字段都是原子值
- 不存在多值属性或重复组
- 每个表代表单个实体类型

✅ **第二范式 (2NF)**: 所有非键属性完全依赖于主键
- 所有表都有明确的主键
- 非键属性不存在对主键的部分依赖

✅ **第三范式 (3NF)**: 消除了传递依赖
- 非键属性之间没有依赖关系
- 所有依赖都直接指向主键

**示例**:
- 旧: `jobs.customer_name` → 非键 (customer_name) 依赖于非键 (job_number)
- 新: `customer.customer_name` → 非键只依赖于主键 `customer.id`

---

## 总结

该设计：
- ✅ 完全符合三范式
- ✅ 支持完整的引用完整性
- ✅ 减少数据冗余和更新异常
- ✅ 为未来功能扩展奠定基础
- ✅ 提供清晰的业务流程追踪
