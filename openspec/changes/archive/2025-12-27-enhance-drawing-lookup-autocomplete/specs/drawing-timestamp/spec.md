# Spec: Drawing Timestamp Tracking

**Capability**: `drawing-timestamp`  
**Version**: 1.0  
**Status**: Proposed

## 概述（Overview）

为 drawings 表添加时间戳列，记录图纸的最后更新时间，为版本管理与智能检索提供基础。

## ADDED Requirements

### Requirement: drawings 表必须包含 updated_at 列

系统 MUST 在 drawings 表中提供 `updated_at` 时间戳列，用于记录每条图纸记录的最后更新时间并支持按时间排序。

**Priority**: Must Have  
**Rationale**: 时间戳是实现智能图纸选择的基础，没有此字段无法区分图纸版本。

#### Scenario: 迁移后新插入的图纸自动记录时间戳

**Given**: drawings 表已执行迁移，添加了 updated_at 列  
**When**: 执行 `INSERT INTO drawings (drawing_name, drawing_number, file_location) VALUES ('Test', 'T001', '/path')`  
**Then**: 
- 新记录的 updated_at 字段自动填充为当前时间戳
- 时间戳格式为 ISO 8601 (如 `2025-12-27T10:30:00Z`)
- 查询 `SELECT updated_at FROM drawings WHERE drawing_number = 'T001'` 返回非 NULL 值

#### Scenario: 迁移前的现有图纸保持 updated_at 为 NULL

**Given**: drawings 表中已有旧记录，如 `drawing_number = 'OLD001'`  
**When**: 执行 `017_add_updated_at_to_drawings.js` 迁移  
**Then**: 
- 旧记录的 updated_at 保持为 NULL
- 查询 `SELECT updated_at FROM drawings WHERE drawing_number = 'OLD001'` 返回 NULL
- 不触发任何数据更新或重写

#### Scenario: updated_at 列定义符合 SQLite 规范

**Given**: 数据库迁移脚本  
**When**: 执行 `PRAGMA table_info(drawings)`  
**Then**: 
- updated_at 列存在
- 类型为 TEXT
- 默认值为 `CURRENT_TIMESTAMP` 或包含 `CURRENT_TIMESTAMP` 的表达式
- 允许 NULL 值（NOT NULL = 0）

### Requirement: 支持迁移回滚

迁移 MUST 可逆，允许安全删除 `updated_at` 列并恢复迁移前的表结构。

**Priority**: Must Have  
**Rationale**: 确保变更可安全撤销，降低生产环境风险。

#### Scenario: 回滚迁移删除 updated_at 列

**Given**: drawings 表已应用迁移，包含 updated_at 列  
**When**: 执行 `npm run db:migrate:down`  
**Then**: 
- updated_at 列被删除
- drawings 表恢复到迁移前的三列结构（drawing_name, drawing_number, file_location）
- 现有数据（除 updated_at）保持完整
- `PRAGMA table_info(drawings)` 不再显示 updated_at

#### Scenario: 回滚后重新迁移可正常执行

**Given**: 已回滚的 drawings 表（无 updated_at 列）  
**When**: 再次执行 `npm run db:migrate`  
**Then**: 
- 迁移成功执行，无错误
- updated_at 列重新添加
- 行为与首次迁移一致

## ADDED Requirements

### Requirement: 迁移系统记录 updated_at 列迁移

迁移系统 MUST 记录 `017_add_updated_at_to_drawings` 的执行状态，确保历史完整并避免重复执行。

**Priority**: Must Have  
**Rationale**: 确保迁移历史完整，避免重复执行。

#### Scenario: migrations.json 记录迁移执行

**Given**: 迁移脚本 `017_add_updated_at_to_drawings.js` 存在  
**When**: 执行 `npm run db:migrate`  
**Then**: 
- `data/migrations.json` 增加一条记录
- 记录包含迁移名称 `017_add_updated_at_to_drawings`
- 记录包含执行时间戳
- `npm run db:migrate:status` 显示该迁移为 "Applied"

## 数据约束（Data Constraints）

- **类型**: TEXT（符合项目约定）
- **格式**: ISO 8601 (YYYY-MM-DDTHH:MM:SSZ)
- **可空性**: 允许 NULL（向后兼容）
- **默认值**: CURRENT_TIMESTAMP（仅对新插入生效）

## 性能影响（Performance Impact）

- **写入**: 每次 INSERT 额外写入一个 TEXT 字段，影响可忽略（< 1ms）
- **查询**: 当前无索引，全表扫描性能取决于表大小
- **建议**: 若 drawings 表超过 10,000 条记录，考虑添加索引 `CREATE INDEX idx_updated_at ON drawings(updated_at DESC)`

## 向后兼容性（Backward Compatibility）

- ✅ 现有代码不受影响（不依赖 updated_at）
- ✅ 现有查询继续工作（新列可选）
- ✅ 旧数据保持完整（updated_at = NULL）

## 安全考量（Security Considerations）

- 时间戳由数据库自动生成，无用户输入风险
- 无敏感信息泄露风险

## 测试要求（Testing Requirements）

- ✅ 单元测试：验证列定义正确
- ✅ 集成测试：验证迁移与回滚流程
- ✅ 数据一致性测试：验证旧数据不受影响
- ⚠️ 性能测试：暂不需要（数据量小）

## 相关文档（Related Documentation）

- [design.md](../../design.md) - 详细设计文档
- [tasks.md](../../tasks.md) - 实现任务清单
- [data/structure.txt](../../../../../data/structure.txt) - 数据库结构文档

## 未来考虑（Future Considerations）

1. **created_at 列**：记录图纸创建时间（与 updated_at 区分）
2. **version 列**：显式版本号字段
3. **updated_by 列**：记录更新者（需要用户认证系统）
4. **批量更新脚本**：基于文件系统修改时间回填 updated_at
