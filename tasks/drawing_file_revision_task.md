# 新任务: 为 drawing_file 表添加 revision 字段

**创建日期**: 2026-01-09  
**目标**: 为 drawing_file 表添加 revision 字段，用于标记每个图纸文件的实际修订版本

---

## 📊 当前状况

### drawing_file 表现状
```
表名: drawing_file
当前记录数: 137,399 条
当前字段: 
  - id (PK)
  - part_id (FK) - 关联的零件
  - file_name - 文件名
  - file_path - 文件路径 (UNIQUE)
  - is_active - 是否活跃
  - last_modified_at - 最后修改时间
  - created_at - 创建时间
  - updated_at - 更新时间
```

### 为什么需要 revision 字段
1. **关联多个 revision** - 同一个零件可能有多个版本的图纸文件
2. **版本追踪** - 清晰记录每个文件对应的是哪个 revision
3. **历史查询** - 方便查询特定 revision 的文件
4. **数据完整性** - 与 part 表的 revision 相对应

### part 表的 revision 分布
```
示例值: '-', '0', '1', '2', '3', '4', '5', 'A', 'AA', 'AB', ...
说明: 数字 (0-9) 或字母 (A-Z) 或 '-' (默认/未知)
```

---

## 🔄 迁移方案

### 迁移脚本: 009_add_revision_to_drawing_file.js

**功能**:
1. 为 drawing_file 表添加 revision 字段
   - 数据类型: TEXT
   - 默认值: '-' (表示未知/未指定)
   - 可空: NO

2. 初始化 revision 数据
   - 如果 drawing_file.part_id 有关联的 part
     → 从 part.revision 复制值
   - 否则
     → 使用默认值 '-'

3. 添加索引
   - `idx_drawing_file_revision` - 快速查询特定 revision 的文件

### SQL 步骤

**创建字段**:
```sql
ALTER TABLE drawing_file ADD COLUMN revision TEXT NOT NULL DEFAULT '-';
```

**初始化数据**:
```sql
UPDATE drawing_file
SET revision = COALESCE(
  (SELECT revision FROM part WHERE part.id = drawing_file.part_id),
  '-'
);
```

**添加索引**:
```sql
CREATE INDEX idx_drawing_file_revision ON drawing_file(revision);
```

---

## 📋 完整 TODO 列表

### 步骤 1: 创建迁移脚本
- [x] 创建 `scripts/migrations/009_add_revision_to_drawing_file.js`
  - 添加字段
  - 初始化数据
  - 添加索引
  - 生成迁移报告

### 步骤 2: 测试迁移
- [x] 备份 record.db
- [x] 在临时库上测试迁移 009
  - 验证字段是否添加
  - 验证数据是否正确初始化
  - 验证索引是否创建

### 步骤 3: 执行真实迁移
- [x] 运行 `npm run db:migrate` 应用迁移

### 步骤 4: 验证结果
- [x] 检查 drawing_file 表结构
- [x] 检查 revision 字段分布
- [x] 检查索引是否可用
- [x] 采样验证数据准确性

---

## 💡 设计考虑

### 1. 默认值选择
**选择**: `-` (破折号)
**原因**:
- 与 part 表的默认 revision 一致
- 清晰表示"未指定"或"未知"
- 在查询时易于区分

### 2. 初始化策略
**方案**: 从关联的 part 表复制 revision

**优点**:
- 数据一致性强
- 新增的文件会继承 part 的 revision
- 简单直观

**注意**:
- 如果 part_id = NULL，则使用默认值 '-'
- 约 0 条记录符合此情况

### 3. 索引策略
**添加单列索引**: `idx_drawing_file_revision`

**用途**:
- 加速 WHERE revision = ? 查询
- 支持按 revision 分组
- 辅助分析特定版本的文件

---

## 🎯 预期结果

迁移完成后：
- ✅ drawing_file 表添加 revision 字段
- ✅ 137,399 条记录初始化 revision 值
- ✅ 创建索引用于快速查询
- ✅ 无数据丢失或损坏

---

## 📊 预期统计

```
revision 字段初始化分布（预期）:
├─ 来自 part 表 (part_id IS NOT NULL): ~137,000 条
└─ 默认值 '-' (part_id IS NULL): ~400 条

索引创建:
├─ idx_drawing_file_revision: 新增
└─ 查询性能: 线性 → O(log n)
```

