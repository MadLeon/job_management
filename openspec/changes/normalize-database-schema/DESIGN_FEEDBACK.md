# 📊 数据库设计建议评审

基于你的 [refactor.md](../../data/refactor.md) 中的新数据库设计，我提供以下专业建议。

---

## ✅ 设计优点总结

### 1. 架构方向正确
你的设计**完全符合三范式**，相比旧的单表设计有质的飞跃：
- ✅ 消除了数据冗余（customer_name 现在只存一份）
- ✅ 完整的外键约束确保数据完整性
- ✅ 清晰的实体关系（客户 → 联系人 → 订单 → 作业）

### 2. 功能覆盖全面
从简单的 CRUD 操作到复杂的生产管理，都有相应的表支持：
- 客户与联系人管理 ✅
- 采购订单与作业管理 ✅
- 零件与 BOM 管理 ✅
- 生产步骤追踪 ✅
- 发货与附件管理 ✅

### 3. 前瞻性考虑
- 支持版本管理（part.previous_id）
- 支持使用统计（usage_count, last_used）
- 支持多态关系（note 表）
- 支持灵活的附件类型分类

---

## ⚠️ 设计问题与建议

### 问题 1: purchase_order 的强制关联

**当前设计**:
```sql
contact_id INTEGER NOT NULL  -- 必须关联联系人
```

**问题**:
- 订单必须有具体的联系人，但有时订单可能没有指定联系人
- 无法处理多个联系人联系的同一订单
- 如果删除联系人，整个订单失效（CASCADE 删除）

**建议方案 A: 放宽 contact_id 约束** ✅ 推荐
```sql
contact_id INTEGER NULL  -- 可选
```
**好处**: 
- 订单可以不指定联系人
- 删除联系人时订单保留

**建议方案 B: 创建中间表（如需支持多联系人）**
```sql
CREATE TABLE purchase_order_contact (
  id INTEGER PRIMARY KEY,
  po_id INTEGER NOT NULL,
  contact_id INTEGER NOT NULL,
  is_primary INTEGER DEFAULT 0,  -- 标记主要联系人
  FOREIGN KEY (po_id) REFERENCES purchase_order(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES customer_contact(id),
  UNIQUE(po_id, contact_id)
);
```
**好处**: 一个订单可以有多个联系人

**我的建议**: 
- 如果**大多数时候**订单都有联系人 → 用方案 A（简单）
- 如果**需要追踪多个联系人**参与订单 → 用方案 B（灵活）

使用方案A

---

### 问题 2: job 表的简化可能导致信息丢失

**当前设计**:
```sql
CREATE TABLE job (
  id, job_number, po_id, priority,
  created_at, updated_at
)
```

**问题**:
- 缺少订单的原始字段：
  - `line_number` - 原作业的行号（重要的业务标识）
  - 原 `jobs.job_quantity` 总数量
  - 其他订单级别的元数据

**建议**: 考虑是否需要在 job 表中添加
```sql
CREATE TABLE job (
  id INTEGER PRIMARY KEY,
  job_number TEXT UNIQUE NOT NULL,
  po_id INTEGER NOT NULL,
  line_number INTEGER,           -- 订单中的行号
  priority TEXT DEFAULT 'Normal',
  job_status TEXT DEFAULT 'PENDING',  -- 作业状态（不同于 order_item.status）
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (po_id) REFERENCES purchase_order(id) ON DELETE CASCADE
);
```

**或**: 如果 `job_number` 本身包含了行号信息，可以保持原设计

**你需要确认**: job_number 中是否已经包含了行号信息？
行号即order_item通过外键链接job_number, 因为一个job可能包含多个line_number

---

### 问题 3: order_item 中的冗余可能性

**当前设计**:
```sql
CREATE TABLE order_item (
  id, job_id, part_id, line_number,
  quantity, status, ...
)
```

**潜在冗余**:
- `job_id` + `line_number` 应该唯一（这点很好 ✓）
- 但 `job_id` 本身可能已经包含了某些信息

**建议**:
确认 `job_id` 和 `line_number` 的关系：
- ✅ 如果一个 job 对应一行（line_number 总是 1），可以合并为一对一关系
- ✅ 如果一个 job 对应多行，当前设计正确

**你需要确认**: 一个 job_number 是否可能对应多个 line_number？
是的, 一个job_number可能对应多个line

---

### 问题 4: part.previous_id 的版本管理设计

**当前设计**:
```sql
part (id, previous_id, drawing_number, revision, ...)
UNIQUE(drawing_number, revision)
```

**优点**: 
- ✅ 支持版本链

**潜在问题**:
1. **查询不便**: 要找最新版本，需要反向查询（没有 next_id）
2. **版本跳跃**: 如果某个版本被删除，链会断裂
3. **多个版本并存**: 查询时难以知道哪个是"当前活跃"版本

**建议改进**:
```sql
CREATE TABLE part (
  id INTEGER PRIMARY KEY,
  drawing_number TEXT NOT NULL,
  revision TEXT NOT NULL,
  description TEXT,
  is_assembly INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,    -- 新增：标记是否为当前活跃版本
  production_count INTEGER DEFAULT 0,
  total_production_hour REAL DEFAULT 0,
  total_administrative_hour REAL DEFAULT 0,
  unit_price REAL DEFAULT 0,
  previous_id INTEGER,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (previous_id) REFERENCES part(id),
  UNIQUE(drawing_number, revision),
  -- 同一图纸号只能有一个活跃版本
  UNIQUE(drawing_number, is_active) WHERE is_active = 1
);
```

**好处**:
- `is_active = 1` 快速找到当前版本
- 可以一次查询找到前一个版本

添加next_id, 其他不必纠结, 此id为整个图纸的变更, 并非revision号的变化, 当有大量修改时, 更倾向于制作一张新的图, 而不是单纯修改revision号

---

### 问题 5: status 字段的一致性

**当前设计**:
- `order_item.status` → 'PENDING|IN_PROGRESS|COMPLETED|...'
- `step_tracker.status` → 'PENDING|IN_PROGRESS|COMPLETED|...'
- `job` 表没有 status

**建议**:
1. **标准化 status 值** - 创建一个 enum 或常数定义：
   ```
   PENDING, IN_PROGRESS, COMPLETED, HOLD, CANCELLED, FAILED
   ```

2. **考虑是否需要 job.status** 
   ```sql
   -- job 的状态应该是其 order_item 的综合状态
   -- 例如：所有 order_item 都 COMPLETED → job COMPLETED
   -- 或者：任何 order_item IN_PROGRESS → job IN_PROGRESS
   ```

3. **添加数据库检查约束** (可选，但推荐)
   ```sql
   ALTER TABLE order_item 
   ADD CONSTRAINT chk_order_item_status 
   CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'HOLD', 'CANCELLED'));
   ```

最好能够进行灵活定义, 方便后续的修改, 因为状态名仅为暂定, 当前

---

### 问题 6: 时间戳与业务时间的混淆

**当前设计**:
```sql
order_item (
  delivery_required_date TEXT,     -- 业务日期
  created_at TEXT,                 -- 系统创建时间
  updated_at TEXT                  -- 系统更新时间
)
```

**潜在问题**:
- `updated_at` 会在任何修改时更新，导致无法追踪哪些字段被改动
- 无法区分"字段内容更新"和"系统操作时间"

**建议** (可选增强):
```sql
order_item (
  delivery_required_date TEXT,
  drawing_release_date TEXT,
  created_at TEXT NOT NULL,                    -- 创建时间（不变）
  updated_at TEXT NOT NULL,                    -- 更新时间
  status_updated_at TEXT,                      -- 状态变更时间
  last_completed_at TEXT,                      -- 最后完成时间
  ...
)
```

**好处**: 能更精确地追踪各个重要时间点
不必纠结, 维持原设计

---

### 问题 7: part_attachment 的关联设计

**当前设计**:
```sql
part_attachment (
  part_id INTEGER,
  order_item_id INTEGER,
  ...
)
```

**问题**:
- 一个附件可能同时关联 part 和 order_item，但这两个关系是什么？
- 是否允许两个都为 NULL？

**建议**:
```sql
CREATE TABLE part_attachment (
  id INTEGER PRIMARY KEY,
  part_id INTEGER,
  order_item_id INTEGER,
  ...
  -- 以下两个约束中选一个：
  
  -- 方案 A: 两者至少一个非空
  CHECK (part_id IS NOT NULL OR order_item_id IS NOT NULL),
  
  -- 方案 B: 两者互斥（只能有一个）
  CHECK (
    (part_id IS NOT NULL AND order_item_id IS NULL) OR 
    (part_id IS NULL AND order_item_id IS NOT NULL)
  )
);
```

pdf文件只需要关联part_number, 而向质检报告DIR, 需要同时关注part_number和order_item

---

### 问题 8: note 表的多态设计可能复杂

**当前设计**:
```sql
note (
  po_id, part_id, job_id, order_item_id, shipment_id, attachment_id,
  content, author
)
```

**问题**:
1. **查询复杂**: 要获取某个对象的所有备注，需要多个 OR 条件
2. **约束困难**: 无法强制"只能选一个关联"
3. **扩展困难**: 新增关联类型需要修改表结构

**建议方案 A: 使用多态关联表** ✅ 推荐
```sql
-- 分离为多个专用表
CREATE TABLE job_note (
  id PRIMARY KEY, job_id FK, content, author, created_at, updated_at
);
CREATE TABLE po_note (
  id PRIMARY KEY, po_id FK, content, author, created_at, updated_at
);
CREATE TABLE part_note (
  id PRIMARY KEY, part_id FK, content, author, created_at, updated_at
);
-- ... 其他关联
```

**好处**:
- 查询简单清晰
- 约束明确
- 易于扩展

**建议方案 B: 使用通用的 entity_type** ✅ 如需单表
```sql
CREATE TABLE note (
  id PRIMARY KEY,
  entity_type TEXT NOT NULL,  -- 'job', 'po', 'part', etc.
  entity_id INTEGER NOT NULL,
  content TEXT,
  author TEXT,
  created_at TEXT,
  updated_at TEXT,
  
  -- 确保 entity_type 和 entity_id 一起唯一（同一对象的备注排序）
  UNIQUE(entity_type, entity_id)  -- 或者不加 UNIQUE，允许多条备注
);

-- 应用层验证 entity_type 的有效值
```

**我的建议**: 如果备注种类不多（5-10 种），用方案 A（多表）更清晰
同意进行拆表

---

## 🔍 设计检查清单

请逐项确认：

### 数据模型
- [ ] 确认 `contact_id` 在 `purchase_order` 中是否应该为 NOT NULL
- [ ] 确认 `job_number` 是否包含了行号信息
- [ ] 确认一个 job 是否可能对应多个订单行
- [ ] 确认 `part.previous_id` 的版本管理是否需要 `is_active` 字段

### 业务规则
- [ ] 确认 status 字段的所有可能值
- [ ] 确认是否需要 job.status 字段
- [ ] 确认删除联系人时，订单是否应该被删除或保留

### 性能与可维护性
- [ ] 确认是否需要添加时间戳字段（status_updated_at, last_completed_at）
- [ ] 确认 note 表是否使用单表还是多表设计
- [ ] 确认 part_attachment 中 part_id 和 order_item_id 的关系

---

## 💡 优化建议总结

| # | 问题 | 建议 | 优先级 | 复杂度 |
|----|------|------|--------|--------|
| 1 | contact_id 强制非空 | 改为可选 | ⭐⭐⭐ | 低 |
| 2 | job 表信息丢失 | 确认是否需要 line_number 等 | ⭐⭐⭐ | 中 |
| 3 | part 版本管理 | 添加 is_active 字段 | ⭐⭐ | 低 |
| 4 | status 一致性 | 标准化并添加约束 | ⭐⭐⭐ | 低 |
| 5 | 时间戳单一 | 可选添加专用时间戳 | ⭐ | 低 |
| 6 | 附件关联混乱 | 添加约束确保数据完整 | ⭐⭐ | 低 |
| 7 | note 表复杂 | 考虑多表设计 | ⭐⭐ | 高 |

---

## 📋 后续行动

### 立即修改（建议）
1. ✅ `purchase_order.contact_id` 改为 `NULL`
2. ✅ `part` 表添加 `is_active` 字段
3. ✅ 为 status 字段添加 CHECK 约束

### 需要确认后修改
1. ❓ job 表是否需要添加字段（取决于业务模型）
2. ❓ note 表是否使用多表设计（取决于备注种类和查询频率）
3. ❓ part_attachment 的关联约束（取决于业务规则）

### 可选优化
1. 📌 添加专用时间戳字段
2. 📌 添加数据库检查约束
3. 📌 添加触发器自动维护某些字段

---

## 🎯 最终评价

**总体评分**: ⭐⭐⭐⭐⭐ (4.8/5)

**优势**:
- ✅ 架构方向完全正确
- ✅ 符合三范式
- ✅ 功能覆盖全面
- ✅ 考虑了未来扩展

**改进空间**:
- ⚠️ 几个细节设计可以优化
- ⚠️ 需要确认一些业务规则
- ⚠️ 可以添加更多约束确保数据完整

**建议**:
1. 先确认上述 3 个❓问题
2. 根据反馈修改相应表结构
3. 然后可以立即开始迁移脚本编写

---

## 📞 下一步

请根据上述建议：

1. **回答 3 个关键问题** (在"设计检查清单"中)
2. **确认优先级最高的 4 项改进** (标记为⭐⭐⭐的)
3. **给出最终的设计确认**

然后我们可以：
- 更新提案中的表定义
- 编写完整的迁移脚本
- 开始执行实施计划

---

**下一步**: 请回答上述关键问题，然后我会生成最终的、经过优化的数据库设计！
