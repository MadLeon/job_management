# drawing-timestamp Specification

## Purpose
TBD - created by archiving change enhance-drawing-lookup-autocomplete. Update Purpose after archive.
## Requirements
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

