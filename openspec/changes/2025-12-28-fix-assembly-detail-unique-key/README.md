# 2025-12-28-fix-assembly-detail-unique-key

本变更用于修复 assembly_detail 表父子关系唯一性问题，新增 unique_key 字段并补全历史数据。

## 目录
- proposal.md 变更动机与影响
- tasks.md 任务拆解与验证
- specs/assembly-detail-unique-key/spec.md 详细需求与场景
- design.md 设计方案与迁移策略

## 变更流程
1. 结构迁移：新增 unique_key 字段（已完成）
2. 数据补全：自动填充所有历史记录的 unique_key（已完成，部分未归属数据待后续人工处理）
3. 验证完整性与唯一性（已完成，自动化测试通过）
4. 更新相关 API/查询逻辑，支持 unique_key 字段（已完成）
5. 编写/更新自动化测试用例（已完成）
6. 文档与 spec delta 补充（已完成）

## 注意事项
- 部分 assembly_detail 记录因 part_number 缺失或无匹配，unique_key 仍为 NULL，需后续人工处理。
- 后续如需扩展前端或更复杂归属逻辑，可参考本次实现。

----

如需补充请在 proposal.md 或 tasks.md 中说明。