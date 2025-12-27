# Proposal: 增强图纸检索与作业表单自动完成

**Change ID**: `enhance-drawing-lookup-autocomplete`  
**Status**: Proposal  
**Created**: 2025-12-27  
**Author**: AI Assistant

## 目标（Goals）

为 CreateJobModal 提供更智能的图纸文件位置检索能力，提升用户创建作业时的效率与准确性。具体包括：

1. **时间戳追踪**：在 drawings 表添加 `updated_at` 列，记录图纸更新时间
2. **智能选择逻辑**：当检索返回多个文件位置时，自动选择最新的图纸
3. **异步自动完成**：在用户输入 part number 后自动触发检索，无需手动操作

## 动机（Motivation）

### 当前痛点

1. **多版本图纸混乱**：同一 part number 可能对应多个图纸位置，系统无法识别最新版本
2. **手动查找低效**：用户需手动搜索并填写文件位置，增加出错概率
3. **时间信息缺失**：drawings 表缺少时间戳，无法追踪图纸更新历史

### 预期收益

- 减少用户手动输入时间约 30-50%
- 降低文件位置错误率
- 为未来图纸版本管理奠定基础
- 提升整体作业创建体验

## 范围（Scope）

### 包含（In Scope）

1. 数据库迁移：为 drawings 表添加 `updated_at TEXT DEFAULT CURRENT_TIMESTAMP` 列
2. API 增强：修改 `/api/jobs/drawing-file-location` 的选择逻辑
3. UI 改进：在 CreateJobModal 的 part_number 字段添加失焦触发检索
4. 加载状态：在检索过程中显示 CircularProgress 指示器

### 不包含（Out of Scope）

- 批量更新现有 drawings 表的 updated_at 值（保留为 NULL，后续手动或脚本更新）
- 图纸版本控制系统
- 其他表单字段的自动完成
- 图纸文件内容的 OCR 或元数据解析

## 架构决策（Architecture Decisions）

### AD-1: 时间戳字段类型

**决策**：使用 `TEXT` 类型存储 ISO 8601 格式日期时间  
**理由**：
- 与项目现有日期字段保持一致（见 jobs.delivery_required_date）
- SQLite 的 TEXT 类型可直接用于字符串排序比较
- 支持 `CURRENT_TIMESTAMP` 作为默认值

**替代方案**：INTEGER (Unix timestamp)  
**拒绝原因**：需要额外转换逻辑，不符合项目约定

### AD-2: 选择最新图纸的策略

**决策**：
1. 当多个结果时，按 `updated_at DESC` 排序
2. 若所有 `updated_at` 为 NULL，选择第一个返回的结果（保持现有行为）

**理由**：
- 向后兼容：旧数据（updated_at=NULL）不影响现有功能
- 渐进式迁移：新图纸自动带时间戳，旧图纸可按需更新

### AD-3: 前端检索触发时机

**决策**：在 part_number 字段的 `onBlur` 事件触发 API 调用  
**理由**：
- 避免输入过程中的频繁请求
- 用户完成输入后立即获得反馈
- 不阻塞其他字段的输入

**替代方案**：防抖的 onChange  
**拒绝原因**：可能在用户快速输入时触发多余请求，增加服务器负载

## 依赖关系（Dependencies）

### 前置依赖

- 现有 drawings 表结构
- 现有 `/api/jobs/drawing-file-location` API
- CreateJobModal 与 JobForm 组件

### 阻塞关系

无。此变更独立，不依赖其他进行中的重构（如客户/联系人表迁移）

### 影响范围

- **数据库**：drawings 表增加一列（非破坏性）
- **API**：drawing-file-location 逻辑增强（向后兼容）
- **UI**：JobForm 组件新增异步行为（不影响现有表单提交）

## 风险与缓解（Risks & Mitigation）

### 风险 1: 迁移失败导致数据库锁定

**概率**: 低  
**影响**: 高（阻塞开发）  
**缓解**：
- 在迁移脚本中使用 `IF NOT EXISTS` 检查
- 提供回滚脚本（down 方法）
- 在测试数据库先验证

### 风险 2: API 性能下降

**概率**: 低  
**影响**: 中（用户等待时间增加）  
**缓解**：
- API 逻辑仅增加排序操作，复杂度不变
- 考虑在 updated_at 列添加索引（后续优化）

### 风险 3: 用户期望与实际行为不符

**概率**: 中  
**影响**: 低（用户困惑）  
**缓解**：
- 在 UI 上添加加载指示器
- 允许用户手动修改检索结果

## 替代方案（Alternatives Considered）

### 方案 A: 使用独立的 drawing_versions 表

**描述**：创建新表存储图纸版本历史  
**拒绝原因**：
- 超出当前需求范围
- 增加系统复杂度
- 可作为未来迭代目标

### 方案 B: 在前端缓存检索结果

**描述**：使用 React Query 缓存 part number 到 file location 的映射  
**拒绝原因**：
- 缓存失效策略复杂
- 跨会话一致性问题
- 当前需求不需要缓存

## 未来工作（Future Work）

1. 批量更新现有 drawings 的 updated_at 值（根据文件系统修改时间）
2. 添加 drawing_versions 表实现完整版本控制
3. 扩展自动完成到其他表单字段（如 customer, contact）
4. 在 drawings 表添加其他元数据（创建者、文件大小等）

## 验收标准（Acceptance Criteria）

1. drawings 表成功添加 `updated_at` 列，默认值为 CURRENT_TIMESTAMP
2. `/api/jobs/drawing-file-location` 返回最新的图纸位置（基于 updated_at）
3. part_number 失焦后自动触发检索，无需手动操作
4. 检索过程中显示 CircularProgress，完成后隐藏
5. 所有现有测试通过，无回归问题
6. 迁移可正常执行与回滚

## 参考资料（References）

- [data/structure.txt](../../../data/structure.txt) - 当前数据库结构
- [src/pages/api/jobs/drawing-file-location.js](../../../src/pages/api/jobs/drawing-file-location.js) - 现有 API 实现
- [src/components/modals/JobForm.jsx](../../../src/components/modals/JobForm.jsx) - 表单组件
- [scripts/migrate.js](../../../scripts/migrate.js) - 迁移系统
