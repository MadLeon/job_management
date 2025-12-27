# Tasks: 增强图纸检索与作业表单自动完成

**Change ID**: `enhance-drawing-lookup-autocomplete`  
**Status**: Proposal  
**Estimated Effort**: 4-6 hours

## 任务清单（Task List）

### 阶段 1: 数据库基础设施（1-2 hours）

- [x] **Task 1.1**: 创建迁移脚本 `017_add_updated_at_to_drawings.js`
  - 添加 `updated_at TEXT DEFAULT CURRENT_TIMESTAMP` 列到 drawings 表
  - 验证列添加成功且默认值正确
  - 实现 down 方法用于回滚
  - **验证**: 运行 `npm run db:migrate` 并检查 `sqlite3 data/jobs.db "PRAGMA table_info(drawings);"`
  - **输出**: 迁移文件，migrations.json 更新

- [x] **Task 1.2**: 测试迁移脚本
  - 在测试数据库执行迁移与回滚
  - 验证现有数据不受影响（updated_at 为 NULL）
  - 插入新记录验证默认值自动填充
  - **验证**: `npm run db:migrate:status` 显示迁移已应用
  - **输出**: 测试通过确认

### 阶段 2: API 层增强（1-2 hours）

- [x] **Task 2.1**: 修改 `/api/jobs/drawing-file-location` 的直接匹配逻辑
  - 在 `SELECT` 语句增加 `updated_at` 字段
  - 添加 `ORDER BY updated_at IS NULL, updated_at DESC LIMIT 1`
  - 保持响应格式不变（仅返回 fileLocation）
  - **验证**: 创建多条相同 drawing_number 的测试数据，验证返回最新的
  - **输出**: drawing-file-location.js 修改

- [x] **Task 2.2**: 修改模糊匹配逻辑（带客户筛选）
  - 在 `SELECT` 语句增加 `updated_at` 字段
  - 添加 `ORDER BY updated_at IS NULL, updated_at DESC`
  - 保持客户路径匹配的遍历逻辑
  - **验证**: 测试多个结果按时间排序
  - **输出**: drawing-file-location.js 修改

- [x] **Task 2.3**: 修改模糊匹配逻辑（无客户筛选）
  - 在 `SELECT` 语句增加 `updated_at` 字段
  - 添加 `ORDER BY updated_at IS NULL, updated_at DESC LIMIT 1`
  - **验证**: 测试边界情况（全部 NULL, 部分 NULL）
  - **输出**: drawing-file-location.js 修改

- [x] **Task 2.4**: API 单元测试（可选但推荐）
  - 编写测试用例覆盖三种匹配策略
  - 测试 updated_at 为 NULL 的向后兼容性
  - 测试多个结果的排序正确性
  - **验证**: 所有测试通过
  - **输出**: 测试文件（如 `__tests__/api/drawing-file-location.test.js`）

### 阶段 3: UI 层交互（2 hours）

- [x] **Task 3.1**: 在 JobFormInner 添加加载状态管理
  - 添加 `isLoadingFileLocation` 状态
  - 创建 `handlePartNumberBlur` 异步函数
  - 实现 API 调用与错误处理
  - **验证**: 控制台日志显示 API 调用与响应
  - **输出**: JobForm.jsx 修改（状态与处理函数）

- [x] **Task 3.2**: 绑定 part_number 字段的 onBlur 事件
  - 在 part_number TextField 添加 `onBlur={handlePartNumberBlur}`
  - 确保不干扰现有 onChange 逻辑
  - **验证**: 失焦时触发 API 调用
  - **输出**: JobForm.jsx 修改（TextField props）

- [x] **Task 3.3**: 实现加载指示器 UI
  - 在 file_location 字段右侧添加 CircularProgress
  - 根据 `isLoadingFileLocation` 控制显示/隐藏
  - 调整 Stack 布局保持对齐
  - **验证**: 手动测试查看加载动画
  - **输出**: JobForm.jsx 修改（UI 组件）

- [x] **Task 3.4**: 自动填充逻辑实现
  - API 返回成功后更新 formData.file_location
  - 允许用户手动修改自动填充的值
  - 处理 API 失败情况（静默失败）
  - **验证**: 端到端测试自动完成流程
  - **输出**: JobForm.jsx 修改（setFormData 调用）

### 阶段 4: 集成与验证（1 hour）

- [x] **Task 4.1**: 端到端手动测试
  - 测试场景 1: 正常自动完成流程
  - 测试场景 2: 无匹配结果（file_location 保持为空）
  - 测试场景 3: 多个匹配结果（验证返回最新）
  - 测试场景 4: 网络错误处理（验证不阻塞用户）
  - **验证**: 所有场景符合预期
  - **输出**: 测试报告或检查清单

- [x] **Task 4.2**: 性能验证
  - 测试 API 响应时间（目标 < 500ms）
  - 验证 UI 无卡顿或闪烁
  - 检查控制台无错误或警告
  - **验证**: Chrome DevTools Performance 分析
  - **输出**: 性能指标记录

- [x] **Task 4.3**: 回归测试
  - 验证现有表单提交功能不受影响
  - 测试其他字段的正常输入
  - 验证 CreateJobModal 与 JobEditModal 均正常工作
  - **验证**: 关键路径测试通过
  - **输出**: 回归测试确认

- [x] **Task 4.4**: 文档更新
  - 更新 data/structure.txt 添加 drawings.updated_at 说明
  - 在 tasks/todo.md 记录本次变更（如需要）
  - 更新 API 文档注释（drawing-file-location.js 顶部）
  - **验证**: 文档准确描述新功能
  - **输出**: 更新的文档文件

## 依赖关系（Dependencies）

```
Task 1.1 (迁移脚本)
  ↓
Task 1.2 (迁移测试)
  ↓
Task 2.1 - Task 2.3 (API 修改) [可并行]
  ↓
Task 2.4 (API 测试) [可选]
  ↓
Task 3.1 - Task 3.4 (UI 修改) [部分可并行]
  ↓
Task 4.1 - Task 4.4 (集成验证) [部分可并行]
```

## 并行工作机会（Parallelization Opportunities）

- Task 2.1, 2.2, 2.3 可由同一人顺序完成，或分配给不同开发者并行
- Task 3.1, 3.2, 3.3, 3.4 前端改动可在 API 完成后并行进行
- Task 4.1, 4.2 可同时进行（不同测试人员）

## 风险缓解检查点（Risk Mitigation Checkpoints）

- **Checkpoint 1** (Task 1.2 后): 验证迁移可安全回滚
- **Checkpoint 2** (Task 2.3 后): 验证 API 向后兼容性
- **Checkpoint 3** (Task 3.4 后): 验证 UI 不阻塞用户操作
- **Checkpoint 4** (Task 4.3 后): 确认无回归问题

## 验收标准（Acceptance Criteria）

每个任务完成后应满足：
1. ✅ 代码通过 ESLint 检查
2. ✅ 无控制台错误或警告
3. ✅ 功能符合设计文档描述
4. ✅ 所有验证步骤通过
5. ✅ 相关文档已更新

## 预估时间分配（Time Allocation）

| 阶段 | 任务数 | 预估时间 | 占比 |
|------|--------|----------|------|
| 阶段 1: 数据库 | 2 | 1-2 hours | 25% |
| 阶段 2: API | 4 | 1-2 hours | 30% |
| 阶段 3: UI | 4 | 2 hours | 35% |
| 阶段 4: 验证 | 4 | 1 hour | 10% |
| **总计** | **14** | **4-6 hours** | **100%** |

## 回滚计划（Rollback Plan）

如需回滚，按逆序执行：
1. 还原 JobForm.jsx 的 UI 改动（Git revert）
2. 还原 drawing-file-location.js 的 API 改动（Git revert）
3. 执行 `npm run db:migrate:down` 回滚迁移
4. 验证系统恢复到变更前状态

## 后续工作（Follow-up Work）

完成本变更后，可考虑：
1. 为 drawings 表添加索引优化查询性能
2. 批量更新现有图纸的 updated_at 值
3. 扩展自动完成到其他表单字段
4. 添加图纸版本历史查看功能
