# part-autocomplete-ui Specification

## Purpose
TBD - created by archiving change enhance-drawing-lookup-autocomplete. Update Purpose after archive.
## Requirements
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

