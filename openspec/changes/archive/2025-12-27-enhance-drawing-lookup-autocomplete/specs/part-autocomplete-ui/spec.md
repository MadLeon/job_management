# Spec: Part Number Autocomplete UI

**Capability**: `part-autocomplete-ui`  
**Version**: 1.0  
**Status**: Proposed

## 概述（Overview）

在 CreateJobModal 的 part_number 字段实现智能自动完成功能，当用户输入完成后自动检索并填充图纸文件位置。

## ADDED Requirements

### Requirement: part_number 失焦时必须触发图纸检索

part_number 字段在失焦时 MUST 调用图纸检索 API，以自动获取文件位置。

**Priority**: Must Have  
**Rationale**: 自动化图纸位置检索，减少用户手动输入错误。

#### Scenario: 输入 part_number 并失焦触发 API 调用

**Given**: 
- 用户打开 CreateJobModal
- part_number 字段为空

**When**: 
1. 用户在 part_number 输入 "GM223-1314"
2. 用户点击其他字段或按 Tab 键（触发 onBlur）

**Then**: 
- 发起 `GET /api/jobs/drawing-file-location?drawingNumber=GM223-1314` 请求
- 控制台输出 `[JobForm] Auto-fill triggered for part: GM223-1314`

#### Scenario: part_number 为空时不触发 API

**Given**: part_number 字段为空或仅包含空格  
**When**: 用户触发 onBlur 事件  
**Then**: 
- 不发起任何 API 请求
- 不显示加载指示器

#### Scenario: 已有 customer_name 时传递给 API

**Given**: 
- customer_name 已选择为 "MHI-Canada"
- part_number 输入为 "Test-Part"

**When**: part_number 失焦  
**Then**: 
- API 调用包含 customerName 参数
- 请求 URL 为 `/api/jobs/drawing-file-location?drawingNumber=Test-Part&customerName=MHI-Canada`

### Requirement: 检索过程中必须显示加载指示器

检索 API 进行期间 MUST 展示加载指示器，为用户提供处理反馈。

**Priority**: Must Have  
**Rationale**: 提供视觉反馈，告知用户系统正在处理。

#### Scenario: API 调用期间显示 CircularProgress

**Given**: part_number 失焦触发 API 调用  
**When**: API 请求进行中（未返回结果）  
**Then**: 
- file_location 字段右侧显示 CircularProgress 组件
- CircularProgress size 为 24px
- 不阻塞用户输入其他字段

#### Scenario: API 返回后隐藏 CircularProgress

**Given**: CircularProgress 正在显示  
**When**: API 返回结果（成功或失败）  
**Then**: 
- CircularProgress 立即隐藏
- file_location 字段恢复正常状态

#### Scenario: 网络超时后隐藏 CircularProgress

**Given**: API 调用超过 5 秒未响应  
**When**: 超时计时器触发  
**Then**: 
- CircularProgress 自动隐藏
- 控制台输出警告信息
- file_location 保持为空（允许用户手动输入）

### Requirement: API 返回结果必须自动填充 file_location

当 API 返回有效 fileLocation 时，表单 MUST 自动将该值写入 file_location 字段。

**Priority**: Must Have  
**Rationale**: 减少用户手动输入，提升效率。

#### Scenario: API 返回有效 fileLocation 时自动填充

**Given**: 
- part_number 为 "GM223-1314"
- API 返回 `{ "fileLocation": "\\\\server\\path\\drawing.pdf" }`

**When**: API 响应被处理  
**Then**: 
- file_location 字段自动填充为 `\\server\path\drawing.pdf`
- formData.file_location 更新为该值
- 用户可见输入框显示完整路径

#### Scenario: API 返回 null 时不修改 file_location

**Given**: 
- part_number 为 "NonExistent"
- API 返回 `{ "fileLocation": null }`

**When**: API 响应被处理  
**Then**: 
- file_location 字段保持为空
- 不显示任何错误提示
- 允许用户手动输入路径

#### Scenario: 用户可以手动修改自动填充的值

**Given**: file_location 已被自动填充为 "/auto/path.pdf"  
**When**: 用户手动修改为 "/manual/path.pdf"  
**Then**: 
- formData.file_location 更新为用户输入的值
- 不触发任何警告或提示
- 表单提交时使用用户修改后的值

### Requirement: API 失败必须静默处理

API 调用失败时 MUST 静默处理，不阻塞用户输入，也不弹出干扰性提示。

**Priority**: Must Have  
**Rationale**: 不阻塞用户操作，保持流畅体验。

#### Scenario: 网络错误时静默失败

**Given**: 网络不可用或 API 返回 500 错误  
**When**: API 调用失败  
**Then**: 
- CircularProgress 隐藏
- file_location 保持为空
- 控制台输出错误信息（不弹出警告框）
- 用户可继续填写其他字段

#### Scenario: API 超时时静默失败

**Given**: API 响应时间超过 5 秒  
**When**: 超时触发  
**Then**: 
- 取消 API 请求（如可能）
- CircularProgress 隐藏
- 控制台输出超时警告
- 不影响表单其他功能

## ADDED Requirements

### Requirement: JobForm 组件必须支持异步加载状态

JobForm 组件 MUST 维护异步加载状态用于控制加载指示器显示/隐藏。

**Priority**: Must Have  
**Rationale**: 支持异步操作而不阻塞 UI。

#### Scenario: 添加 isLoadingFileLocation 状态

**Given**: JobFormInner 组件  
**When**: 检查组件状态定义  
**Then**: 
- 包含 `const [isLoadingFileLocation, setIsLoadingFileLocation] = useState(false);`
- 初始值为 false
- 通过 setIsLoadingFileLocation 控制加载状态

#### Scenario: 添加 handlePartNumberBlur 处理函数

**Given**: JobFormInner 组件  
**When**: 检查事件处理函数  
**Then**: 
- 包含 `handlePartNumberBlur` 异步函数
- 函数包含 try-catch-finally 结构
- finally 块中调用 `setIsLoadingFileLocation(false)`

### Requirement: part_number TextField 必须绑定 onBlur 事件

part_number 输入框 MUST 绑定 onBlur 事件以触发自动检索逻辑。

**Priority**: Must Have  
**Rationale**: 触发自动完成逻辑的入口。

#### Scenario: part_number 字段包含 onBlur 属性

**Given**: JobForm.jsx 的 part_number TextField 组件  
**When**: 检查组件 props  
**Then**: 
- 包含 `onBlur={handlePartNumberBlur}`
- 保留现有的 `onChange={handleChange}`
- 不影响其他 TextField 属性

## 用户体验要求（UX Requirements）

### Requirement: 自动完成不得阻塞用户输入

**Priority**: Must Have  
**Rationale**: 确保流畅的表单填写体验。

#### Scenario: 检索期间用户可继续输入其他字段

**Given**: part_number 失焦，API 调用进行中  
**When**: 用户点击 customer_name 或其他字段  
**Then**: 
- 字段立即获得焦点
- 用户可正常输入
- 不显示任何阻塞提示

#### Scenario: 用户可重新修改 part_number

**Given**: part_number 失焦后触发了 API 调用  
**When**: 用户再次点击 part_number 字段并修改  
**Then**: 
- 可正常编辑
- 再次失焦时触发新的 API 调用
- 前一次 API 结果被忽略（如尚未返回）

### Requirement: 加载指示器位置必须合理

**Priority**: Should Have  
**Rationale**: 避免 UI 布局抖动，保持视觉一致性。

#### Scenario: CircularProgress 位于 file_location 行末尾

**Given**: file_location 字段的 Stack 容器  
**When**: isLoadingFileLocation 为 true  
**Then**: 
- CircularProgress 显示在 VisibilityIcon 按钮之后
- 与其他图标对齐
- 不导致输入框宽度变化

#### Scenario: CircularProgress 隐藏时不占用空间

**Given**: isLoadingFileLocation 为 false  
**When**: 渲染 file_location 行  
**Then**: 
- CircularProgress 完全不渲染（使用条件渲染）
- Stack 容器宽度保持一致
- 不留空白占位符

## 性能要求（Performance Requirements）

### Requirement: 避免重复 API 调用

**Priority**: Should Have  
**Rationale**: 减少服务器负载，提升响应速度。

#### Scenario: 相同 part_number 不重复调用

**Given**: 
- part_number 当前值为 "ABC"
- file_location 已自动填充

**When**: 用户再次点击 part_number 但未修改，然后失焦  
**Then**: 
- 不发起新的 API 请求
- 保持现有 file_location 值
- 不显示加载指示器

#### Scenario: part_number 修改后重新调用

**Given**: 
- part_number 原值为 "ABC"
- file_location 为 "/path/abc.pdf"

**When**: 用户修改 part_number 为 "XYZ" 并失焦  
**Then**: 
- 发起新的 API 请求
- 清空或保留旧的 file_location（设计决策）
- 显示加载指示器

## 可访问性要求（Accessibility Requirements）

### Requirement: 加载状态必须对屏幕阅读器友好

**Priority**: Should Have  
**Rationale**: 确保无障碍访问。

#### Scenario: CircularProgress 包含 aria-label

**Given**: CircularProgress 组件  
**When**: 检查可访问性属性  
**Then**: 
- 包含 `aria-label="Loading drawing location"`
- 或使用 `role="progressbar"` + `aria-valuenow`

## 错误恢复（Error Recovery）

### Requirement: 用户始终可以手动输入

**Priority**: Must Have  
**Rationale**: 自动完成失败时的兜底方案。

#### Scenario: API 失败后允许手动输入

**Given**: 
- part_number 为 "Test"
- API 返回 500 错误

**When**: 用户点击 file_location 字段  
**Then**: 
- 字段可正常输入
- 不显示禁用状态
- 表单可正常提交

## 向后兼容性（Backward Compatibility）

- ✅ 不影响 JobEditModal（仅编辑现有作业）
- ✅ 不影响表单验证逻辑
- ✅ 不影响表单提交流程
- ✅ 手动输入功能完全保留

## 测试要求（Testing Requirements）

### Requirement: 必须包含端到端测试

**Priority**: Should Have  
**Rationale**: 验证完整用户旅程。

#### Scenario: E2E 测试自动完成流程

**Given**: 测试环境的 CreateJobModal  
**When**: 执行以下步骤：
1. 输入 part_number
2. 触发 onBlur
3. 等待 API 返回
4. 验证 file_location 自动填充

**Then**: 
- 所有步骤无错误
- 填充的值与 API 返回一致

## 相关规范（Related Specs）

- [drawing-api-selection](../drawing-api-selection/spec.md) - 依赖项：API 逻辑
- [drawing-timestamp](../drawing-timestamp/spec.md) - 间接依赖：时间戳列

## 未来考虑（Future Considerations）

1. **防抖优化**：在快速输入时延迟 API 调用
2. **结果缓存**：使用 React Query 缓存检索结果
3. **多结果选择**：显示下拉菜单让用户选择版本
4. **预测输入**：输入时显示建议列表
5. **键盘快捷键**：支持 Ctrl+Enter 手动触发检索
