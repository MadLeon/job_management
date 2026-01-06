# 旧新设计对比与字段映射

## 概览表

| 维度 | 旧设计 | 新设计 | 改进 |
|------|--------|--------|------|
| **表数量** | 7 个 | 15 个 | +8 个，功能更完整 |
| **规范化程度** | 不符合三范式 | 完全符合三范式 | 消除数据冗余 |
| **外键约束** | 无 | 完整的外键 + 级联删除 | 确保引用完整性 |
| **客户管理** | 字符串存储 | 独立表 + 使用统计 | 支持多联系人、频度排序 |
| **采购订单** | 混在 jobs 中 | 独立表 | 清晰的业务关系 |
| **BOM 支持** | ❌ 无 | ✅ part_tree 表 | 支持多级装配管理 |
| **生产追踪** | ❌ 无 | ✅ step_tracker 表 | 支持条码扫描集成 |
| **附件管理** | 简单字段 | ✅ 多种附件类型 | 更灵活的文件管理 |
| **版本管理** | ❌ 无 | ✅ 零件版本链 | 支持版本历史 |
| **备注系统** | ❌ 无 | ✅ 通用 note 表 | 支持全面的批注 |

---

## 旧数据库结构回顾

### 旧表列表 (7 个)
1. `jobs` - 单一的工作表（包含过多字段）
2. `job_history` - 历史记录
3. `detail_drawing` - 图纸元数据
4. `assembly_detail` - 装配细节
5. `drawings` - 图纸库
6. `assemblies` - 装配库
7. `customer_folder_map` - 客户文件夹映射

### 旧 jobs 表字段 (26 个字段，混乱)
```
job_id, oe_number, job_number, customer_name [冗余],
customer_contact [冗余], po_number, packing_slip, 
invoice_number, delivery_required_date, delivery_shipped_date,
... (还有很多其他字段混在一起)
```

**问题**:
- 一个表承载了太多职责
- `customer_name` 在每条记录中重复 → 更新异常
- `customer_contact` 作为字符串 → 无法管理多个联系人
- `po_number` 和 `oe_number` 混在一起 → 无法独立管理订单
- 缺乏关系表 → 无法支持 BOM、生产步骤等高级功能

---

## 新数据库结构详解

### 新表列表 (15 个)

#### 第 1 层: 客户与联系人
```
customer (1) ──→ (N) customer_contact
```

#### 第 2 层: 采购订单与订单明细
```
customer_contact (1) ──→ (N) purchase_order (1) ──→ (N) job
                                                         ↓
                                               (1) order_item (N)
```

#### 第 3 层: 零件与生产
```
order_item ──→ part (1) ──┬─→ (N) part_tree (自引用，BOM)
                          ├─→ (N) process_template
                          └─→ (N) part_attachment

                              process_template (1) ──→ (N) step_tracker
```

#### 第 4 层: 发货与支持
```
order_item (1) ──→ (N) shipment_item (N) ──→ (1) shipment

part (1) ──→ (N) drawing_file

customer (1) ──→ (N) folder_mapping

[任何实体] ──→ (N) note (通用备注表)
```

---

## 详细字段映射

### 1. 客户信息映射

**旧结构**:
```
jobs.customer_name = 'MHI-Canada'
jobs.customer_contact = 'Lana Bozic'
```

**新结构**:
```
customer (id=1)
  ├─ customer_name = 'MHI-Canada'
  ├─ usage_count = 5 (自动统计)
  └─ last_used = '2025-12-20'

customer_contact (id=10)
  ├─ customer_id = 1 (FK)
  ├─ contact_name = 'Lana Bozic'
  └─ contact_email = 'lana@mhi.com'
```

**好处**:
- ✅ 客户名称只存储一次，减少冗余
- ✅ 支持多个联系人
- ✅ 使用统计自动追踪

---

### 2. 采购订单映射

**旧结构**:
```
jobs.po_number = '51001'
jobs.oe_number = '37721'
```

**新结构**:
```
purchase_order (id=1)
  ├─ po_number = '51001' (UNIQUE)
  ├─ oe_number = '37721' (可选)
  ├─ contact_id = 10 (FK → customer_contact)
  ├─ is_active = 1
  └─ closed_at = NULL

job (id=1)
  ├─ job_number = '69279'
  ├─ po_id = 1 (FK → purchase_order)
  └─ priority = 'Urgent'
```

**好处**:
- ✅ 订单和作业关系明确
- ✅ 支持订单状态追踪（is_active）
- ✅ 支持订单关闭时间记录

---

### 3. 作业与订单明细映射

**旧结构**:
```
jobs (单一层级)
  - job_number = '69279'
  - line_number = '4'
  - part_number = 'GM223-1314-9'
  - job_quantity = '40'
  - part_description = 'Angle'
  - delivery_required_date = '7-Mar-24'
  - ... (其他字段混在一起)
```

**新结构**:
```
job (id=1)
  ├─ job_number = '69279' (UNIQUE)
  ├─ po_id = 1 (FK)
  └─ priority = 'Urgent'

order_item (id=1)
  ├─ job_id = 1 (FK)
  ├─ part_id = 5 (FK → part)
  ├─ line_number = 4 (UNIQUE with job_id)
  ├─ quantity = 40
  ├─ status = 'IN_PROGRESS'
  ├─ production_hour = 5.5
  ├─ administrative_hour = 2.0
  ├─ delivery_required_date = '2024-03-07'
  └─ ... (其他字段有序组织)
```

**好处**:
- ✅ 一个作业可以有多个明细行（清晰的一对多关系）
- ✅ 零件、生产时间等字段独立管理
- ✅ 支持订单明细状态追踪

---

### 4. 零件管理映射

**旧结构**:
```
jobs.part_number = 'GM223-1314-9'
jobs.revision = ''
jobs.part_description = 'Angle'

detail_drawing (id=1)
  ├─ drawing_number = 'GM223-1314-9'
  ├─ description = 'Angle'
  ├─ revision = NULL
  └─ isAssembly = 0
```

**新结构**:
```
part (id=5)
  ├─ drawing_number = 'GM223-1314-9'
  ├─ revision = 'A' (支持版本)
  ├─ description = 'Angle'
  ├─ is_assembly = 0
  ├─ production_count = 12 (使用统计)
  ├─ total_production_hour = 66.0
  ├─ total_administrative_hour = 24.0
  └─ unit_price = 523.72

-- 版本管理示例
part (id=5)  revision='A', previous_id=NULL
  ↓
part (id=6)  revision='B', previous_id=5
  ↓
part (id=7)  revision='C', previous_id=6
```

**好处**:
- ✅ 消除了冗余的描述信息
- ✅ 支持版本管理（previous_id）
- ✅ 自动统计生产数据
- ✅ 支持价格管理

---

### 5. BOM 管理映射

**旧结构**:
```
assemblies (id→part_number, drawing_number)
  - 只记录父子关系
  - 无法处理多级 BOM
```

**新结构**:
```
part_tree (自引用外键)
  ├─ id=1: parent_id=1 (装配体), child_id=2 (子装配), qty=1
  ├─ id=2: parent_id=2 (子装配), child_id=3 (零件), qty=2
  ├─ id=3: parent_id=2 (子装配), child_id=4 (零件), qty=3
  └─ id=4: parent_id=1 (装配体), child_id=5 (零件), qty=5

-- 支持多级 BOM 查询
装配体-A (id=1)
  ├─ 子装配体-B (id=2), qty=1
  │   ├─ 零件-C (id=3), qty=2
  │   └─ 零件-D (id=4), qty=3
  └─ 零件-E (id=5), qty=5
```

**好处**:
- ✅ 支持任意深度的 BOM 层级
- ✅ 灵活的父子关系管理
- ✅ 支持 BOM 版本（通过 previous_id）

---

### 6. 生产步骤追踪映射

**旧结构**: ❌ 无此功能

**新结构**:
```
process_template (零件的工艺定义)
  ├─ id=1: part_id=5, shop_code='TURN', row_number=1, description='车削'
  ├─ id=2: part_id=5, shop_code='MILL', row_number=2, description='铣削'
  └─ id=3: part_id=5, shop_code='DRILL', row_number=3, description='钻孔'

step_tracker (实际执行记录，支持条码扫描)
  ├─ id=1: order_item_id=1, process_template_id=1, status='COMPLETED', 
           start_time='2025-12-20 08:00', end_time='2025-12-20 10:30'
  ├─ id=2: order_item_id=1, process_template_id=2, status='IN_PROGRESS',
           start_time='2025-12-20 10:45', operator_id='Carlos'
  └─ id=3: order_item_id=1, process_template_id=3, status='PENDING'
```

**好处**:
- ✅ 完整的生产过程追踪
- ✅ 支持操作员和机器信息记录
- ✅ 支持时间统计和效率分析

---

### 7. 发货管理映射

**旧结构**:
```
jobs.packing_slip = ''
jobs.packing_quantity = ''
jobs.invoice_number = ''
jobs.delivery_shipped_date = ''
```

**新结构**:
```
shipment (id=1)
  ├─ packing_slip_number = 'PS-2025-001' (UNIQUE)
  ├─ invoice_number = 'INV-2025-001' (可选)
  └─ delivery_shipped_date = '2025-12-20'

shipment_item (id=1)
  ├─ order_item_id = 1 (FK)
  ├─ shipment_id = 1 (FK)
  └─ quantity = 50 (支持分批发货)

shipment_item (id=2)
  ├─ order_item_id = 1 (FK，同一个订单明细)
  ├─ shipment_id = 2 (FK，另一个发货单)
  └─ quantity = 50
```

**好处**:
- ✅ 发货单与订单明细分离
- ✅ 支持分批发货追踪
- ✅ 清晰的发货历史记录

---

### 8. 附件管理映射

**旧结构**:
```
jobs.file_location (文件路径)
drawings (简单的路径记录)
```

**新结构**:
```
drawing_file (图纸文件，特化)
  ├─ id=1: part_id=5, file_path='...\\MHI-Canada\\GM223-1314-9_v1.pdf', is_active=0
  └─ id=2: part_id=5, file_path='...\\MHI-Canada\\GM223-1314-9_v2.pdf', is_active=1

part_attachment (多种附件，通用)
  ├─ id=1: part_id=5, file_type='DRAWING', file_name='drawing.pdf'
  ├─ id=2: order_item_id=1, file_type='INSPECTION', file_name='inspection.pdf'
  ├─ id=3: order_item_id=1, file_type='MTR', file_name='mtr.pdf'
  └─ id=4: order_item_id=1, file_type='DEVIATION', file_name='deviation.pdf'

folder_mapping (客户文件夹)
  └─ customer_id=1, folder_name='E:\\Customers\\MHI-Canada\\'
```

**好处**:
- ✅ 支持多种附件类型（图纸、检验、MTR 等）
- ✅ 文件版本管理（is_active）
- ✅ 清晰的文件路径追踪

---

### 9. 备注系统映射

**旧结构**: ❌ 无此功能

**新结构**:
```
note (通用备注表，多态关联)
  ├─ id=1: po_id=1, content='该订单需要加急处理', author='Manager_A'
  ├─ id=2: order_item_id=1, content='零件表面有轻微划伤，已确认可用', author='Quality'
  ├─ id=3: part_id=5, content='该零件库存不足，需要补充', author='Warehouse'
  ├─ id=4: job_id=1, content='需要特殊包装', author='Logistics'
  └─ id=5: shipment_id=1, content='已发货，等待签收', author='Driver'
```

**好处**:
- ✅ 可在任何实体上添加备注
- ✅ 追踪备注的作者和时间
- ✅ 灵活的业务批注系统

---

## 数据迁移关键问题

### Q1: 旧的 358 条 jobs 记录如何迁移？

**建议方案**:

```sql
-- 伪代码示例

-- 1. 提取所有唯一的客户
INSERT INTO customer (customer_name, created_at, updated_at)
SELECT DISTINCT customer_name FROM jobs
WHERE customer_name IS NOT NULL;

-- 2. 为每个客户创建默认联系人
INSERT INTO customer_contact (customer_id, contact_name)
SELECT customer.id, COALESCE(jobs.customer_contact, 'Default Contact')
FROM (SELECT DISTINCT customer_id, customer_name FROM jobs) AS j
JOIN customer ON customer.customer_name = j.customer_name;

-- 3. 创建采购订单
INSERT INTO purchase_order (po_number, oe_number, contact_id)
SELECT DISTINCT jobs.po_number, jobs.oe_number, customer_contact.id
FROM jobs
JOIN customer ON customer.customer_name = jobs.customer_name
JOIN customer_contact ON customer_contact.customer_id = customer.id;

-- 4. 创建作业和订单明细
INSERT INTO job (job_number, po_id, priority)
SELECT jobs.job_number, purchase_order.id, COALESCE(jobs.priority, 'Normal')
FROM jobs
JOIN purchase_order ON purchase_order.po_number = jobs.po_number;

-- 5. 创建零件
INSERT INTO part (drawing_number, revision, description, unit_price)
SELECT DISTINCT jobs.part_number, jobs.revision, jobs.part_description, 
       CAST(REPLACE(jobs.unit_price, '$', '') AS REAL)
FROM jobs;

-- 6. 创建订单明细
INSERT INTO order_item (job_id, part_id, line_number, quantity, status, 
                        delivery_required_date)
SELECT job.id, part.id, jobs.line_number, CAST(jobs.job_quantity AS INTEGER),
       'PENDING', jobs.delivery_required_date
FROM jobs
JOIN job ON job.job_number = jobs.job_number
JOIN part ON part.drawing_number = jobs.part_number;
```

---

## 总结对比表

| 功能 | 旧设计 | 新设计 | 改进程度 |
|------|--------|--------|---------|
| 客户管理 | 字符串 + 重复 | 独立表 + 使用统计 | ⭐⭐⭐⭐⭐ |
| 联系人管理 | 单字段 | 独立表 + 多联系人 | ⭐⭐⭐⭐⭐ |
| 采购订单 | 混在 jobs | 独立表 + 状态追踪 | ⭐⭐⭐⭐⭐ |
| 零件管理 | 简单字段 | 独立表 + 版本管理 | ⭐⭐⭐⭐ |
| BOM 支持 | ❌ | ✅ 多级 | ⭐⭐⭐⭐⭐ |
| 生产追踪 | ❌ | ✅ 完整 | ⭐⭐⭐⭐⭐ |
| 发货管理 | 简单字段 | 独立表 + 分批 | ⭐⭐⭐⭐ |
| 附件管理 | 简单路径 | 多类型 + 版本 | ⭐⭐⭐⭐ |
| 备注系统 | ❌ | ✅ 通用 | ⭐⭐⭐⭐⭐ |
| 规范化程度 | ❌ 不规范 | ✅ 完全三范式 | ⭐⭐⭐⭐⭐ |
| 数据冗余 | 严重 | 最小化 | ⭐⭐⭐⭐⭐ |
| 扩展性 | 差 | 优秀 | ⭐⭐⭐⭐⭐ |
| **总体评分** | 3 / 10 | **9.5 / 10** | **+6.5** |

---

**结论**: 新设计在各个方面都显著优于旧设计，特别是在规范化、扩展性和功能完整性上有质的提升。
