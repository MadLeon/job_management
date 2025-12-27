# Spec: Drawing API Selection Logic

**Capability**: `drawing-api-selection`  
**Version**: 1.0  
**Status**: Proposed

## 概述（Overview）

增强 `/api/jobs/drawing-file-location` API，当检索返回多个匹配图纸时，智能选择最新版本返回给客户端。

## ADDED Requirements

### Requirement: 直接匹配必须返回最新的图纸

API 在 drawing_number 精确匹配时 MUST 基于 `updated_at` 返回最新的 file_location。

**Priority**: Must Have  
**Rationale**: 当 drawing_number 精确匹配时，应返回该编号的最新版本图纸。

#### Scenario: 多个相同 drawing_number 时返回 updated_at 最新的

**Given**: drawings 表包含以下记录：
```
| drawing_number | file_location | updated_at |
|----------------|---------------|------------|
| GM223-1314     | /path/v1.pdf  | 2024-01-01T00:00:00Z |
| GM223-1314     | /path/v2.pdf  | 2025-12-27T00:00:00Z |
```
**When**: 调用 `GET /api/jobs/drawing-file-location?drawingNumber=GM223-1314`  
**Then**: 
- 响应状态码为 200
- 响应 JSON 为 `{ "fileLocation": "/path/v2.pdf" }`
- 不返回 `/path/v1.pdf`（旧版本）

#### Scenario: 所有 updated_at 为 NULL 时返回第一条记录

**Given**: drawings 表包含以下记录：
```
| drawing_number | file_location | updated_at |
|----------------|---------------|------------|
| OLD-001        | /path/a.pdf   | NULL       |
| OLD-001        | /path/b.pdf   | NULL       |
```
**When**: 调用 `GET /api/jobs/drawing-file-location?drawingNumber=OLD-001`  
**Then**: 
- 响应状态码为 200
- 响应 JSON 为 `{ "fileLocation": "/path/a.pdf" }` 或 `{ "fileLocation": "/path/b.pdf" }`（确定性返回第一条）
- 行为与迁移前一致（向后兼容）

#### Scenario: 混合 NULL 和非 NULL 时返回非 NULL 中最新的

**Given**: drawings 表包含以下记录：
```
| drawing_number | file_location | updated_at |
|----------------|---------------|------------|
| MIX-001        | /path/old.pdf | NULL       |
| MIX-001        | /path/new.pdf | 2025-12-27T00:00:00Z |
```
**When**: 调用 `GET /api/jobs/drawing-file-location?drawingNumber=MIX-001`  
**Then**: 
- 响应状态码为 200
- 响应 JSON 为 `{ "fileLocation": "/path/new.pdf" }`
- NULL 值被排除在优先选择之外

### Requirement: 模糊匹配 + 客户筛选必须返回最新的客户相关图纸

当提供 customerName 进行模糊匹配时，API MUST 在匹配客户路径的结果中按 `updated_at` 选择最新的 file_location。

**Priority**: Must Have  
**Rationale**: 当使用模糊匹配且提供客户名称时，应返回该客户的最新图纸版本。

#### Scenario: 多个客户路径匹配时返回最新的

**Given**: 
- drawings 表包含：
```
| drawing_name | file_location | updated_at |
|--------------|---------------|------------|
| GM-Part-A    | \\server\MHI\drawing_v1.pdf | 2024-01-01T00:00:00Z |
| GM-Part-A    | \\server\MHI\drawing_v2.pdf | 2025-12-27T00:00:00Z |
| GM-Part-A    | \\server\Candu\drawing.pdf  | 2025-12-26T00:00:00Z |
```
- customer_folder_map 无 MHI 的映射（使用原客户名）

**When**: 调用 `GET /api/jobs/drawing-file-location?drawingNumber=GM-Part&customerName=MHI-Canada`  
**Then**: 
- 响应状态码为 200
- 响应 JSON 为 `{ "fileLocation": "\\\\server\\MHI\\drawing_v2.pdf" }`
- 排除 Candu 路径（不匹配客户）
- 选择 MHI 路径中最新的版本

#### Scenario: 模糊匹配使用 folder_name 映射

**Given**: 
- drawings 表包含：
```
| drawing_name | file_location | updated_at |
|--------------|---------------|------------|
| Test-Part    | \\server\MHI-Folder\drawing.pdf | 2025-12-27T00:00:00Z |
```
- customer_folder_map 包含：
```
| customer_name | folder_name |
|---------------|-------------|
| MHI-Canada    | MHI-Folder  |
```

**When**: 调用 `GET /api/jobs/drawing-file-location?drawingNumber=Test&customerName=MHI-Canada`  
**Then**: 
- 响应状态码为 200
- 响应 JSON 为 `{ "fileLocation": "\\\\server\\MHI-Folder\\drawing.pdf" }`
- 使用 folder_name 而非 customer_name 进行路径匹配

### Requirement: 模糊匹配（无客户）必须返回最新图纸

当仅提供 drawingNumber 进行模糊匹配时，API MUST 在所有结果中按 `updated_at` 选择最新的 file_location。

**Priority**: Must Have  
**Rationale**: 当仅提供 drawing_number 时，应返回全局最新的图纸。

#### Scenario: 无客户筛选时返回所有结果中最新的

**Given**: drawings 表包含：
```
| drawing_name | file_location | updated_at |
|--------------|---------------|------------|
| Part-123     | /pathA/old.pdf | 2024-01-01T00:00:00Z |
| Part-123     | /pathB/new.pdf | 2025-12-27T00:00:00Z |
```

**When**: 调用 `GET /api/jobs/drawing-file-location?drawingNumber=Part-123`  
**Then**: 
- 响应状态码为 200
- 响应 JSON 为 `{ "fileLocation": "/pathB/new.pdf" }`

### Requirement: API 响应格式保持不变

API MUST 保持现有 JSON 响应结构，仅返回 `fileLocation` 字段，不暴露 `updated_at` 等新增字段。

**Priority**: Must Have  
**Rationale**: 确保前端代码无需修改，向后兼容。

#### Scenario: 响应 JSON 结构不变

**Given**: 任意有效的 drawingNumber 请求  
**When**: API 返回结果  
**Then**: 
- 响应为 JSON 对象
- 包含 `fileLocation` 字段（string 或 null）
- 不包含 `updated_at` 或其他新字段
- HTTP 头 `Content-Type: application/json`

#### Scenario: 错误响应格式不变

**Given**: 缺少 drawingNumber 参数  
**When**: 调用 `GET /api/jobs/drawing-file-location`  
**Then**: 
- 响应状态码为 400
- 响应 JSON 为 `{ "error": "drawingNumber query parameter is required" }`

## ADDED Requirements

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

## 性能要求（Performance Requirements）

### Requirement: API 响应时间不超过 1 秒

**Priority**: Should Have  
**Rationale**: 确保用户体验流畅，不阻塞表单输入。

#### Scenario: P95 响应时间 < 1000ms

**Given**: drawings 表包含少于 50,000 条记录  
**When**: 执行 100 次随机 API 调用  
**Then**: 
- P50 响应时间 < 200ms
- P95 响应时间 < 1000ms
- P99 响应时间 < 2000ms

## 错误处理（Error Handling）

### Requirement: 数据库错误必须返回 500 状态码

**Priority**: Must Have  
**Rationale**: 明确区分客户端错误与服务器错误。

#### Scenario: 数据库连接失败

**Given**: 数据库文件不可访问或损坏  
**When**: 调用 API  
**Then**: 
- 响应状态码为 500
- 响应 JSON 包含 `error` 字段
- 服务器控制台记录详细错误信息

## 日志要求（Logging Requirements）

### Requirement: 必须记录查询参数与结果

**Priority**: Should Have  
**Rationale**: 便于调试和性能分析。

#### Scenario: 控制台输出查询信息

**Given**: 任意 API 调用  
**When**: API 执行过程中  
**Then**: 
- 控制台输出 `[drawing-file-location] Query: { drawingNumber, customerName }`
- 控制台输出 `[drawing-file-location] Result: { fileLocation }`（可选）

## 向后兼容性（Backward Compatibility）

- ✅ 响应格式不变
- ✅ 错误处理逻辑不变
- ✅ 旧数据（updated_at=NULL）行为一致
- ✅ 现有前端代码无需修改

## 测试要求（Testing Requirements）

- ✅ 单元测试：覆盖三种匹配策略
- ✅ 集成测试：验证数据库查询正确性
- ✅ 边界测试：NULL 值、空结果、多个结果
- ✅ 性能测试：响应时间满足要求（可选）

## 相关规范（Related Specs）

- [drawing-timestamp](../drawing-timestamp/spec.md) - 依赖项：时间戳列
- [part-autocomplete-ui](../part-autocomplete-ui/spec.md) - 消费者：UI 自动完成

## 未来考虑（Future Considerations）

1. **分页支持**：当结果过多时返回分页数据
2. **版本列表接口**：返回所有版本供用户选择
3. **缓存机制**：缓存热门查询结果
4. **相关性评分**：基于多维度（时间、客户、使用频率）计算最佳匹配
