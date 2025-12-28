## IMPLEMENTED

### assembly_detail 表 unique_key 归属
- 已实现 assembly_detail 表新增 unique_key 字段，所有新建/更新记录均支持唯一归属。
- 历史数据已自动补全 unique_key，部分未归属数据已记录待后续人工处理。
- API 路由已支持 unique_key 字段自动补全与更新。
- 已有自动化测试覆盖 unique_key 归属逻辑。
## ADDED Requirements


### Requirement: assembly_detail 表 MUST 支持唯一归属
- assembly_detail 表 MUST 新增 unique_key 字段，类型为 TEXT，可为 NULL（历史数据补全后不应为 NULL）。
- unique_key MUST 用于标识该装配细节归属于 jobs 表的哪条记录。

#### Scenario:
- 当新增或更新 assembly_detail 记录时，系统 SHALL 要求指定 unique_key（通过 part_number 在 jobs 表查找）。
- 历史数据补全时，系统 MUST 自动查找 jobs 表中 part_number 匹配项，填充 unique_key。
- 若 part_number 在 jobs 表中有多个匹配，则系统 SHALL 提示人工或业务规则辅助选择。

### Requirement: 数据完整性 MUST 得到保证
- 所有 assembly_detail 记录 MUST 拥有唯一的 unique_key。
- 后续查询、统计、展示 SHALL 通过 unique_key 精确定位。

#### Scenario:
- 查询某 job 的所有装配细节时，系统 SHALL 按 unique_key 精确筛选。
- 统计/分析时系统 SHALL 避免重复或归属错误。

## MODIFIED Requirements


### Requirement: 相关 API/查询 MUST 支持 unique_key
- 新增/更新 API 路由参数 MUST 支持按 unique_key 查询。
- 相关 UI 展示逻辑 MAY 支持 unique_key 过滤。

#### Scenario:
- 用户在前端选择 job 时，装配明细 SHALL 按 unique_key 精确展示。

---

如需补充其他场景请告知。