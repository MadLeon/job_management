# 变更提案：修复 assembly_detail 表父子关系唯一性问题

## 背景
assembly_detail 表用于记录当前活跃的总装图及其与装配体的父子关系。由于 jobs 表可能存在多个相同 part_number 的记录（即同一总装图在不同 job 下出现），导致 assembly_detail 表仅靠 part_number 和 drawing_number 无法唯一定位一条装配细节。

## 问题
- 多个 job 可能拥有相同 part_number 和 drawing_number，assembly_detail 无法区分具体归属。
- 影响装配明细的准确性、后续查询和数据完整性。

## 变更目标
- 在 assembly_detail 表中新增 unique_key 字段（对应 jobs 表的 unique_key），实现装配细节的唯一归属。
- 对现有 assembly_detail 数据进行补全，自动查找并填充 unique_key。
- 保证后续所有装配明细均可唯一定位。

## 影响范围
- 数据库结构：assembly_detail 表新增 unique_key 字段。
- 数据迁移：补全所有历史数据。
- 代码层：后续 API/查询需支持 unique_key。

## 兼容性
- 不影响现有主键 id。
- 仅增强唯一性和数据准确性。

## 相关表
- jobs（unique_key 唯一标识 job）
- assembly_detail（需补全 unique_key）

---

如有补充需求请告知。