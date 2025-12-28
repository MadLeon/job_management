# 设计说明

## 方案选型
- 采用 jobs 表的 unique_key 作为 assembly_detail 的归属标识，避免 part_number/drawing_number 冲突。
- 数据补全采用 SQL JOIN，优先自动匹配，特殊情况可人工处理。

## 兼容性与扩展性
- 不影响现有主键和业务逻辑。
- 后续如需支持多归属，可扩展 unique_key 为数组或多行。

## 迁移策略
- 先结构迁移，后数据补全，最后验证完整性。
- 迁移脚本需支持回滚。

## 风险与注意事项
- 部分 assembly_detail 记录因 part_number 缺失或无匹配，unique_key 仍为 NULL，需后续人工处理。
- 已确保所有后端 API/数据库操作均支持 unique_key 字段。

----

如有特殊业务规则或补充需求请及时反馈。