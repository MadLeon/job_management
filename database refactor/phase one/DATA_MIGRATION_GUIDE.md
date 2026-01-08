# 数据迁移脚本说明

**状态**: ✅ 新数据库已创建，迁移脚本已准备  
**新数据库**: `data/record.db`  
**迁移脚本**: `scripts/migrate-data.js`

---

## 📊 迁移进度

### ✅ 已完成
- [x] 创建新数据库 `record.db`
- [x] 执行迁移脚本 001-005（创建 21 个表 + 索引）
- [x] 更新 `src/lib/db.js` 指向 `record.db`
- [x] 更新 `scripts/migrate.js` 使用 `record.db`
- [x] 编写数据迁移脚本 `migrate-data.js`

### ⏳ 待审核
- 数据迁移脚本 `migrate-data.js` 逻辑

### 🔄 待执行
- 运行 `node scripts/migrate-data.js` 进行数据迁移

---

## 📝 数据迁移脚本详解

### 脚本位置
```
scripts/migrate-data.js
```

### 执行命令
```bash
node scripts/migrate-data.js
```

### 迁移逻辑流程

#### 1️⃣ 步骤 1: 迁移客户数据
**来源**: `jobs.jobs.customer_name` (去重)  
**目标**: `record.customer`

```
jobs (customer_name) → customer (id, customer_name)
```

#### 2️⃣ 步骤 2: 迁移联系人数据
**来源**: `jobs.jobs.customer_contact` (按 customer 分组)  
**目标**: `record.customer_contact`

```
jobs (customer_name, customer_contact) → customer_contact (id, customer_id, contact_name)
```

#### 3️⃣ 步骤 3: 迁移采购订单数据
**来源**: `jobs.jobs.po_number` (去重)  
**目标**: `record.purchase_order`

```
jobs (po_number, oe_number, customer_contact) → purchase_order (id, po_number, oe_number, contact_id)
```

#### 4️⃣ 步骤 4: 迁移作业数据
**来源**: `jobs.jobs.job_number` (去重)  
**目标**: `record.job`

```
jobs (job_number, po_number) → job (id, job_number, po_id, priority='Normal')
```

#### 5️⃣ 步骤 5: 迁移零件数据
**来源**: `jobs.jobs.part_number, revision` (去重)  
**目标**: `record.part`

```
jobs (part_number, revision, part_description) → part (id, drawing_number, revision, description)
```

#### 6️⃣ 步骤 6: 迁移订单明细数据
**来源**: `jobs.jobs` (每条记录作为一个 order_item)  
**目标**: `record.order_item`

```
jobs 表的每一行 → order_item (
  job_id, part_id, line_number, quantity,
  actual_price, drawing_release_date, delivery_required_date,
  created_at, updated_at
)
```

**字段映射**:
| 旧字段 | 新字段 | 转换逻辑 |
|--------|--------|----------|
| job_number | job_id | 通过 job 表关联查找 |
| part_number + revision | part_id | 通过 part 表关联查找 |
| line_number | line_number | 直接复制 |
| job_quantity | quantity | parseInt() |
| unit_price | actual_price | 移除 `$` 和 `,`，parseFloat() |
| drawing_release | drawing_release_date | 日期格式转换 |
| delivery_required_date | delivery_required_date | 日期格式转换 |
| create_timestamp | created_at | 直接复制 |
| last_modified | updated_at | 直接复制 |

#### 7️⃣ 步骤 7: 迁移发货单数据
**来源**: `jobs.jobs.packing_slip` (去重)  
**目标**: `record.shipment`

```
jobs (packing_slip, invoice_number, delivery_shipped_date) → shipment (
  id, packing_slip_number, invoice_number, delivery_shipped_date
)
```

---

## 🔄 日期格式转换

脚本支持多种日期格式的自动转换：

| 格式 | 示例 | 转换后 |
|------|------|--------|
| `M/D/YY` | `4/6/23` | `2023-04-06` |
| `DD-MMM-YY` | `7-Mar-24` | `2024-03-07` |
| `YYYY-MM-DD` | `2024-01-07` | `2024-01-07` |

---

## ⚠️ 关键注意事项

### 数据约束验证
脚本会自动验证：
- ✅ 外键约束（job_id, po_id, part_id, contact_id）
- ✅ 唯一性约束（po_number, job_number, drawing_number+revision）
- ✅ NOT NULL 字段必须有值

### 错误处理
- 脚本会跳过**缺少必要外键**的记录（如作业缺少 PO）
- 脚本会警告但**不会停止**的错误：
  - 重复的 customer_name
  - 无效的日期格式
  - 缺少 part_id（order_item 的 part_id 可为 NULL）

### 预期的数据统计
根据旧数据库：
- **358 个 jobs 记录** 可能转换为：
  - ~20-40 个 customer（去重）
  - ~50-100 个 customer_contact（去重）
  - ~50-100 个 purchase_order（去重）
  - ~100-200 个 job（去重）
  - ~200-300 个 part（去重）
  - 358 个 order_item（一对一）
  - ~10-30 个 shipment（去重）

---

## 📋 脚本审核清单

请检查以下内容：

- [ ] **步骤 1**: 客户去重逻辑正确
- [ ] **步骤 2**: 联系人与客户的关联关系正确
- [ ] **步骤 3**: PO 与联系人的关联关系正确
- [ ] **步骤 4**: Job 与 PO 的关联关系正确
- [ ] **步骤 5**: Part 去重（drawing_number + revision）正确
- [ ] **步骤 6**: OrderItem 的所有字段映射正确，包括字段转换
- [ ] **步骤 7**: Shipment 去重逻辑正确
- [ ] **日期格式**: 所有日期转换格式正确
- [ ] **错误处理**: 异常捕获和警告信息清晰

---

## 🚀 后续执行

当你审核完毕并确认脚本逻辑正确时：

```bash
# 运行数据迁移
node scripts/migrate-data.js

# 查看迁移结果统计
# 脚本会输出迁移的行数和任何警告信息
```

---

## 🔍 验证迁移结果

迁移完成后，你可以验证：

```bash
# 检查新数据库的表和数据统计
node scripts/check-db.js
```

应该看到：
- `customer` 表有数据
- `customer_contact` 表有数据
- `purchase_order` 表有数据
- `job` 表有数据
- `order_item` 表有数据
- `part` 表有数据
- `shipment` 表有数据

---

## ❓ 常见问题

### Q: 如果迁移失败怎么办？
A: 迁移脚本不会中断，会输出警告信息。检查警告后，可以：
1. 修复源数据（jobs.db）
2. 手动删除 `data/migrations.json` 中的前 5 个迁移
3. 运行 `npm run db:migrate:down` 回滚
4. 修复脚本或数据后重新迁移

### Q: 如果某些数据没有迁移怎么办？
A: 检查脚本输出的警告信息，通常是因为：
- 缺少外键关联（如 job_number 不存在）
- 数据格式不符合预期（如 unit_price 无法解析）
- UNIQUE 约束冲突

### Q: 可以只迁移部分数据吗？
A: 可以。修改脚本的 SQL 查询添加 WHERE 条件。

---

**等待你的审核和确认！** ✅
