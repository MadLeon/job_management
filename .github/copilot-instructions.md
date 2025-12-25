# AI 编码代理指南

## 第一优先级规则

- 非常重要: 你的所有回复消息都必须使用简体中文。
- 你生成的所有代码均使用 JSDoc 风格注释
- 每个会话开始前, 阅读 structure.txt 并运行 `scripts/check-db.js` 来建立对数据库的了解
- 永远不要假设任何事情。始终检查代码库以确认细节。
- 永远不要编造代码或细节。如果你不确定，请查阅代码库

## 工作流程

1. First think through the problem, read the codebase for relevant files, and write a plan to tasks/todo.md.
2. The plan should have a list of todo items that you can check off as you complete them.
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high-level explanation of what changes you made.
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the todo.md file with a summary of the changes you made and any other relevant
   information.
8. DO NOT BE LAZY. NEVER BE LAZY. IF THERE IS A BUG, FIND THE ROOT CAUSE AND FIX IT. NO TEMPORARY FIXES. YOU ARE A SENIOR DEVELOPER. NEVER BE LAZY.
9. MAKE ALL FIXES AND CODE CHANGES AS SIMPLE AS HUMANLY POSSIBLE. THEY SHOULD ONLY IMPACT NECESSARY CODE RELEVANT TO THE TASK AND NOTHING ELSE. IT SHOULD IMPACT AS LITTLE CODE AS POSSIBLE. YOUR GOAL IS TO NOT INTRODUCE ANY BUGS. IT'S ALL ABOUT SIMPLICITY.

## 数据库与迁移

### 迁移系统 ([scripts/migrate.js](scripts/migrate.js))

**命令**:

- `npm run db:migrate` - 应用待处理迁移
- `npm run db:migrate:down` - 回滚最后一次迁移
- `npm run db:migrate:status` - 查看迁移状态

**规则**:

- 文件命名: `scripts/migrations/NNN_description.js` (按序号递增)
- 每个迁移导出: `name`, `up(db)`, `down(db)`
- 已应用迁移记录在 `data/migrations.json`
- 创建表/列前检查是否存在，使用 `db.pragma('table_info(table_name)')`

### 测试与调试

**数据库检查**:

- `node scripts/check-db.js` - 快速查看表结构、记录数和样本数据
- `node scripts/test-db.js` - 执行数据库操作测试

**测试用例创建**:

- 当用户选择代码并请求测试时，创建针对性测试用例
- API 路由测试：模拟 req/res 对象，验证响应格式和状态码
- 组件测试：使用 React Testing Library 测试渲染和交互
- 数据库操作测试：使用临时测试数据库，测试后清理
- 辅助函数测试：单元测试输入/输出和边界情况

**调试工具**:

- 浏览器 DevTools 的 React DevTools 扩展
- Next.js 开发模式的详细错误页面
- 控制台日志记录（API 路由中使用 `console.error` 记录上下文）

## 项目特定约定

### 数据模型

- 在 [data/data.js](data/data.js) 中包含 priorityOptions, customerList 以及其他以 dummy 开头的临时数据

## 文件结构参考

- **API 层**: `src/pages/api/*` - 所有数据库操作
- **组件**: `src/components/` - 按功能组织的 UI
- **数据库访问**: `src/lib/db.js` - 单例，绝不在其他地方直接导入 Database
- **实用工具**: `src/helpers/` - 过渡混合、路径匹配、共享函数
- **数据库模式**: `scripts/migrations/` 中的迁移 - 每个功能一个
- **配置**: `next.config.mjs` (Next.js), `theme.js` (MUI), `queryClient.js` (React Query)
- **数据库结构**: `data/structure.txt`

---

## 进行中项目：客户和联系人数据库重构

**现状与目标**：

- 当前：客户列表使用硬编码数组 (`data/data.js` → `customerList`)，联系人从 jobs 表动态抽取
- 目标：将客户和联系人迁移到独立数据库表，支持动态管理、多种排序方式、使用统计

**采用方案**：方案一（独立表结构）+ 方案二（usage_count 统计）

**库表设计**：

- `customers` (customer_id, customer_name, pdf_folder_path, is_active, usage_count, last_used, created_at, updated_at)
- `contacts` (contact_id, contact_name, customer_name, usage_count, last_used, is_active, created_at, updated_at)

**执行策略**：

1. 先在 [tasks/todo.md](tasks/todo.md) 中规划所有需修改的部分（数据库、API、前端组件等）
2. 集中执行所有数据库迁移、API 开发、前端更新
3. 最后统一更新 structure.txt 和相关文档

**详见** [tasks/todo.md](tasks/todo.md) 获取完整任务清单
