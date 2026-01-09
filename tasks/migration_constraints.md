# 迁移约束和决策总结

**创建日期**: 2026-01-09  
**主题**: assemblies 迁移的核心约束和判断逻辑

---

## 📌 part_tree 表的 UNIQUE 约束

```sql
UNIQUE(parent_id, child_id)
```

### 含义
- 同一个父件（parent_id）不能有相同的子件（child_id）
- 一个parent可以有多个child，但每个child只能出现一次

### 示例
```
✅ 允许:
   parent_id=1, child_id=2  (quantity=5)
   parent_id=1, child_id=3  (quantity=3)
   parent_id=2, child_id=2  (quantity=1)

❌ 不允许:
   parent_id=1, child_id=2  (quantity=5)
   parent_id=1, child_id=2  (quantity=10)  ← 冲突！
```

### 对迁移的影响
- 当前分析: assemblies 没有重复的 (parent, child) 组合
- 所以迁移过程中不会遇到 UNIQUE 约束冲突

---

## 📌 is_assembly 判断规则

### 核心规则
**分两个来源处理**：

1. **来自 part_number 的零件** → `is_assembly = 1`（总是装配体）
2. **来自 drawing_number 的零件** → 检查是否包含 `-GA-` 字符串
   - 包含 `-GA-` → `is_assembly = 1`
   - 不含 `-GA-` → `is_assembly = 0`

### 含义
- assemblies 表中的 part_number 列本身就代表"总装件"，所以都应该标记为 is_assembly=1
- drawing_number 列是"零件"，其中需要进一步判断是否是分装图
- `-GA-` = "General Assembly" 的缩写，标志该零件本身有子件

### 数据分布
- drawing_number 中含有 `-GA-`: **158 个** (标记为 is_assembly=1)
- drawing_number 中不含 `-GA-`: **1204 个** (标记为 is_assembly=0)
- part_number 中所有: **73 个** (全部标记为 is_assembly=1)

### 示例
```
with -GA-:
  RT-88000-70066-000-1-GA-D  → is_assembly = 1
  RT-87920-0351-01-GA-D      → is_assembly = 1
  
without -GA-:
  12918-0066-0008            → is_assembly = 0
  RT-88230-0244-01-DD-C      → is_assembly = 0
```

### 为什么不用 part_number?
- part_number 来自 assemblies 的"总装件"列
- 但这只是当前层级的标识，不足以判断全局的多层次结构
- drawing_number 包含标准的编号规则（-GA- 表示分装图）
- 更准确和可靠

---

## 💡 迁移流程中的应用

### 第一阶段：导入缺失零件

```javascript
assemblies.forEach(record => {
  // part_number - 所有都是 is_assembly = 1
  if (!partExists(record.part_number)) {
    insertPart({
      drawing_number: record.part_number,
      is_assembly: 1,  // part_number 都是总装件
      description: record.description || null,
      revision: '-',
      // ... 其他默认值
    });
  }
  
  // drawing_number - 根据 -GA- 判断
  if (!partExists(record.drawing_number)) {
    insertPart({
      drawing_number: record.drawing_number,
      is_assembly: record.drawing_number.includes('-GA-') ? 1 : 0,  // 根据 -GA- 判断
      description: record.description || null,
      revision: '-',
      // ... 其他默认值
    });
  }
});
```

### 第二阶段：迁移 part_tree 关系

```javascript
assemblies.forEach(record => {
  const parent = findPart(record.part_number);
  const child = findPart(record.drawing_number);
  
  // 检查自引用
  if (parent.id === child.id) {
    console.log(`⊘ 跳过自引用: ${record.part_number} → ${record.drawing_number}`);
    return;
  }
  
  // 检查 UNIQUE 约束（虽然当前不需要）
  if (partTreeExists(parent.id, child.id)) {
    console.log(`⊘ 跳过重复: (${parent.id}, ${child.id})`);
    return;
  }
  
  // 插入关系
  insertPartTree({
    parent_id: parent.id,
    child_id: child.id,
    quantity: parseInt(record.quantity) || 1,
  });
});
```

---

## 🎯 总结

| 项目 | 规则 | 备注 |
|------|------|------|
| **UNIQUE 约束** | (parent_id, child_id) | 防止重复的父子关系 |
| **is_assembly 判断** | `drawing_number.includes('-GA-')` | -GA- 表示分装图 |
| **quantity 默认值** | 空或 NULL → 1 | 当数量缺失时 |
| **自引用处理** | 跳过 (parent = child) | 违反逻辑 |

