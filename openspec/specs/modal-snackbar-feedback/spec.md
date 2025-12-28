# modal-snackbar-feedback Specification

## Purpose
TBD - created by archiving change add-file-path-copy-snackbar. Update Purpose after archive.
## Requirements
### Requirement: 文件夹路径复制成功后必须显示 Snackbar 提示

在用户点击资源管理器图标（FolderOpen）并成功复制文件夹路径后，MUST 显示 Snackbar 通知，告知用户路径已复制到剪切板。

**Priority**: Must Have  
**Rationale**: 提升用户操作反馈，确认复制操作成功。

#### Scenario: JobForm 中点击 FolderOpen 图标复制路径

**Given**: JobForm 组件已加载，file_location 字段有有效路径值（如 `G:\Candu\123.pdf`）  
**When**: 用户点击 FolderOpen 图标按钮  
**Then**: 
- 文件夹路径 `G:\Candu` 被复制到剪切板
- 显示 Snackbar，消息为"路径已复制"
- Snackbar 使用 success severity（绿色）
- Snackbar 在底部居中显示
- 3 秒后自动关闭，或用户可手动关闭
- 文件选择对话框同时打开

#### Scenario: PartEditForm 中点击 FolderOpen 图标复制路径

**Given**: PartEditForm 组件已加载，file_location 字段有有效路径值（如 `D:\Projects\drawing.pdf`）  
**When**: 用户点击 FolderOpen 图标按钮  
**Then**: 
- 文件夹路径 `D:\Projects` 被复制到剪切板
- 显示 Snackbar，消息为"路径已复制"
- Snackbar 使用 success severity（绿色）
- Snackbar 在底部居中显示
- 3 秒后自动关闭，或用户可手动关闭
- 文件选择对话框同时打开

#### Scenario: 无文件路径时点击 FolderOpen 不显示 Snackbar

**Given**: JobForm 或 PartEditForm 组件已加载，file_location 字段为空  
**When**: 用户点击 FolderOpen 图标按钮  
**Then**: 
- 不复制任何内容到剪切板
- 不显示 Snackbar
- 文件选择对话框正常打开

#### Scenario: 复制失败时不显示 Snackbar

**Given**: JobForm 或 PartEditForm 组件已加载，file_location 字段有值  
**When**: 用户点击 FolderOpen 图标但剪切板 API 调用失败（如权限问题）  
**Then**: 
- 控制台记录错误信息
- 不显示 Snackbar
- 文件选择对话框仍然打开

### Requirement: Snackbar 必须自动关闭并支持手动关闭

显示的 Snackbar 通知 MUST 在 3 秒后自动消失，同时 MUST 提供关闭按钮允许用户手动关闭。

**Priority**: Must Have  
**Rationale**: 避免 Snackbar 长时间占据屏幕空间，同时给予用户主动控制权。

#### Scenario: Snackbar 3 秒后自动关闭

**Given**: Snackbar 已显示"路径已复制"消息  
**When**: 3 秒时间经过  
**Then**: 
- Snackbar 自动消失
- 界面恢复正常状态

#### Scenario: 用户手动关闭 Snackbar

**Given**: Snackbar 已显示"路径已复制"消息  
**When**: 用户点击 Snackbar 的关闭按钮  
**Then**: 
- Snackbar 立即消失
- 界面恢复正常状态

### Requirement: Snackbar 样式必须与项目 UI 一致

Snackbar 组件 MUST 使用 MUI Alert 组件，采用 success severity，确保与项目整体 UI 风格一致。

**Priority**: Must Have  
**Rationale**: 保持用户界面视觉一致性和专业性。

#### Scenario: Snackbar 使用正确的 MUI 组件和样式

**Given**: 开发者实现 Snackbar 功能  
**When**: 检查代码实现  
**Then**: 
- 使用 `<Snackbar>` 包裹 `<Alert>` 组件
- Alert 设置 `severity="success"`
- 显示绿色背景和成功图标
- 位置设置为 `anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}`
- 文本为简体中文"路径已复制"

