# add-file-path-copy-snackbar 任务清单

## 实施顺序（Implementation Order）

- [x] 1. 在 JobForm.jsx 中添加 Snackbar 状态和组件
  - 导入 `Snackbar` 和 `Alert` 组件
  - 添加 `snackbarOpen` 状态
  - 在 `handleBrowseClick` 复制成功后设置状态为 true
  - 在表单底部添加 Snackbar UI

- [x] 2. 在 PartEditForm.jsx 中添加 Snackbar 状态和组件
  - 导入 `Snackbar` 和 `Alert` 组件
  - 添加 `snackbarOpen` 状态
  - 在 `handleBrowse` 中添加复制逻辑（当前缺失）和状态设置
  - 在表单底部添加 Snackbar UI

- [x] 3. 测试 JobForm 中的 Snackbar 功能
  - 有文件路径时点击 FolderOpen 验证 Snackbar 显示
  - 无文件路径时点击 FolderOpen 验证不显示 Snackbar
  - 验证自动关闭和手动关闭

- [x] 4. 测试 PartEditForm 中的 Snackbar 功能
  - 有文件路径时点击 FolderOpen 验证 Snackbar 显示
  - 无文件路径时点击 FolderOpen 验证不显示 Snackbar
  - 验证自动关闭和手动关闭

- [x] 5. 代码审查与最终验证
  - 确认两个表单代码一致性
  - 验证不影响现有功能
  - 检查控制台无报错

## 依赖关系（Dependencies）

- 无外部依赖，仅使用项目现有的 MUI 组件

## 验证清单（Verification Checklist）

- [ ] Snackbar 显示位置合理（不遮挡按钮）
- [ ] 消息文本使用简体中文
- [ ] 3 秒自动关闭计时准确
- [ ] 用户可通过点击关闭按钮手动关闭
- [ ] 复制失败时不显示 Snackbar
- [ ] 文件选择对话框正常打开

## 注意事项（Notes）

- PartEditForm 当前的 `handleBrowse` 没有复制路径到剪切板的逻辑，需要补充
- 确保与 JobForm 中的 `handleBrowseClick` 保持一致的行为模式
- Snackbar 使用 MUI 的 `severity="success"` 和绿色主题
