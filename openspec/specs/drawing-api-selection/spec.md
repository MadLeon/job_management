# drawing-api-selection Specification

## Purpose
TBD - created by archiving change enhance-drawing-lookup-autocomplete. Update Purpose after archive.
## Requirements
### Requirement: SQL 查询必须按 updated_at 排序

所有针对 drawings 的查询 MUST 使用 `ORDER BY updated_at IS NULL, updated_at DESC` 以确保最新记录优先。

**Priority**: Must Have  
**Rationale**: 确保数据库层面返回的结果已排序，减少应用层处理。

#### Scenario: 直接匹配查询包含 ORDER BY 子句

**Given**: drawing-file-location.js API 代码  
**When**: 检查直接匹配的 SQL 语句  
**Then**: 
- 包含 `ORDER BY updated_at IS NULL, updated_at DESC`
- 包含 `LIMIT 1`

#### Scenario: 模糊匹配查询包含 ORDER BY 子句

**Given**: drawing-file-location.js API 代码  
**When**: 检查模糊匹配的 SQL 语句  
**Then**: 
- 包含 `ORDER BY updated_at IS NULL, updated_at DESC`
- 不限制数量（需遍历客户路径匹配）

