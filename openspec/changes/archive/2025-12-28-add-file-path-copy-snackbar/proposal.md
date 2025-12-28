# add-file-path-copy-snackbar 提案

## 目的（Purpose）

在作业表单（JobForm）和零件编辑表单（PartEditForm）的模态框中，添加 Snackbar 用户反馈组件。当用户点击资源管理器（FolderOpen）图标复制文件夹路径后，显示"路径已复制"提示，提升用户体验与操作确认感。

## 动机（Motivation）

目前在 JobForm 和 PartEditForm 中点击 FolderOpen 图标时，系统会：
1. 提取并复制文件夹路径到剪切板
2. 打开文件选择对话框

但用户无法直观感知复制操作是否成功，缺少即时反馈。添加 Snackbar 提示可以：
- 明确告知用户路径已成功复制
- 提升操作透明度和用户信心
- 符合现代 UI/UX 最佳实践

## 影响范围（Impact）

### 受影响组件
- `src/components/modals/JobForm.jsx` - 作业创建/编辑表单
- `src/components/modals/PartEditForm.jsx` - 零件编辑表单

### UI 变更
- 新增：Snackbar 通知组件（MUI）
- 行为变更：点击 FolderOpen 图标后显示 3 秒 Snackbar 提示

### 依赖
- MUI `@mui/material` 中的 `Snackbar` 和 `Alert` 组件（已存在于项目）

## 实现方案（Approach）

1. **状态管理**：在 JobForm 和 PartEditForm 中添加 `snackbarOpen` 状态
2. **事件触发**：在 `handleBrowseClick` / `handleBrowse` 复制成功后设置 snackbarOpen 为 true
3. **UI 呈现**：在表单底部添加 Snackbar 组件，显示"路径已复制"消息
4. **自动关闭**：3 秒后或用户手动关闭

## 约束（Constraints）

- 最小改动原则：仅修改两个表单组件，不影响其他功能
- 保持一致性：两个表单使用相同的 Snackbar 样式和行为
- 错误处理：复制失败时不显示 Snackbar（仅在控制台记录错误）

## 风险与缓解（Risks）

| 风险 | 可能性 | 缓解策略 |
|------|--------|----------|
| Snackbar 遮挡重要按钮 | 低 | 使用 MUI 默认底部居中位置 |
| 多次快速点击导致 Snackbar 堆叠 | 低 | 使用单个状态控制，新触发覆盖旧提示 |
| 剪切板 API 不兼容某些浏览器 | 低 | 已有错误捕获，失败时不显示 Snackbar |

## 时间线（Timeline）

- 实现时间：约 30 分钟
- 测试时间：15 分钟
- 总计：< 1 小时

## 成功标准（Success Criteria）

- [ ] 点击 FolderOpen 图标后显示 Snackbar
- [ ] Snackbar 显示"路径已复制"中文消息
- [ ] 3 秒后自动关闭或用户可手动关闭
- [ ] 不影响文件选择对话框正常打开
- [ ] JobForm 和 PartEditForm 行为一致
