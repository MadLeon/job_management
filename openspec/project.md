# 项目说明（OpenSpec）

## 目标与范围（Purpose）
- 制造业作业管理与追踪：维护从创建到完成的全生命周期数据，包括作业信息、图纸、装配细节、文档历史与生产历史。
- 高效检索与可视化：提供客户/联系人筛选、作业搜索、图纸文件定位、时间线与统计图等视图。
- 数据规范化与演进：通过迁移脚本统一日期格式、完善唯一约束，推进客户与联系人独立建表与使用统计。

## 技术栈（Tech Stack）
- 前端框架：Next.js 16（Pages Router），React 19，启用 `reactCompiler` 与 `reactStrictMode`（见 [next.config.mjs](../next.config.mjs)）。
- UI 与样式：MUI v7（`@mui/material`、`@mui/icons-material`、`@mui/x-*`），Emotion（`@emotion/react`、`@emotion/styled`），自定义主题与缓存（见 [src/theme.js](../src/theme.js)、[src/createEmotionCache.js](../src/createEmotionCache.js)）。
- 数据获取：TanStack React Query v5（见 [src/lib/queryClient.js](../src/lib/queryClient.js)）。
- 路由与别名：Next Pages 路由（`pages/`），路径别名 `@/*`（见 [jsconfig.json](../jsconfig.json)）。
- 后端与数据库：Node.js ESM、`better-sqlite3` 直连 SQLite，单例访问（见 [src/lib/db.js](../src/lib/db.js)）。
- 时间处理：`dayjs`。
- 代码质量：ESLint 9 + `eslint-config-next/core-web-vitals`（见 [eslint.config.mjs](../eslint.config.mjs)）。

## 项目约定（Project Conventions）

### 代码风格（Code Style）
- 模块系统：`type: module`（ESM）。
- 注释规范：统一采用 JSDoc 风格注释。
- ESLint：使用 Next Core Web Vitals 规则，忽略 `.next/`, `out/`, `build/`, `node_modules/`, `data/`, `scripts/`, `public/` 等目录（见 [eslint.config.mjs](../eslint.config.mjs)）。
- 路径别名：`@/*` 指向 `src/*`，在前后端共享导入中使用（如 `@/lib/db`）。

### 架构模式（Architecture Patterns）
- 应用结构：
	- Pages 路由位于 [src/pages](../src/pages)，包含业务页面与 API 路由（例如 [src/pages/api/jobs/index.js](../src/pages/api/jobs/index.js)）。
	- 组件按功能分组存放于 [src/components](../src/components)，含表格、表单、通用 UI 等。
	- 上下文状态位于 [src/context](../src/context)，封装侧边栏、筛选器等全局状态。
	- 工具与混入位于 [src/helpers](../src/helpers)。
- 数据访问：
	- 数据库单例：所有 API 路由通过 `getDB()` 访问 SQLite，统一启用 `foreign_keys=ON`、`journal_mode=DELETE`、`transaction_isolation=IMMEDIATE`（见 [src/lib/db.js](../src/lib/db.js)）。
	- 迁移系统：Node 脚本驱动的顺序迁移，记录存于 [data/migrations.json](../data/migrations.json)，迁移文件位于 [scripts/migrations](../scripts/migrations)（见 [scripts/migrate.js](../scripts/migrate.js)）。
	- 结构文档：数据库结构详见 [data/structure.txt](../data/structure.txt)。
- UI 与数据：
	- MUI 统一主题与组件库，Emotion 负责样式与 SSR 兼容。
	- React Query 管理服务器状态与缓存，适配 API 路由返回数据。

### 测试与调试（Testing Strategy）
- 数据库检查：使用 [scripts/check-db.js](../scripts/check-db.js) 快速输出表结构与样例数据。
- 迁移验证：通过 `npm run db:migrate:status` 查看已应用与待应用迁移；必要时 `npm run db:migrate` 执行，`npm run db:migrate:down` 回滚最后一次。
- API 路由：在本地开发模式下验证请求/响应（例如 [src/pages/api/jobs/index.js](../src/pages/api/jobs/index.js)）。建议以模拟 `req/res` 的方式进行端到端测试。
- 前端组件：建议采用 React Testing Library 进行渲染与交互测试（待补充测试目录与样例）。
- 调试工具：利用 Next.js 开发模式错误页与控制台日志（API 路由中统一使用 `console.error` 记录上下文）。

### Git 工作流（Git Workflow）
- 目前仓库未内置显式分支/提交约定文档。建议采用：`main` + 功能分支，提交信息遵循 Conventional Commits（可后续在 `README` 或本文件补充）。

## 领域上下文（Domain Context）
- 作业（`jobs`）是核心实体，采用组合唯一键 `unique_key = job_number|line_number`，支持优先级与文件位置标记。
- 历史作业（`job_history`）保存已完成或归档记录，结构与 `jobs` 相近，新增 `completed_timestamp`。
- 图纸与装配（`detail_drawing`、`assembly_detail`、`drawings`、`assemblies`）描述与链接作业的零件与图纸关系，`assembly_detail` 关联合理的数量与交付日期。
- 客户文件夹映射（`customer_folder_map`）用于将规范化客户名映射到文件系统路径，便于快速打开相关文档。
- 进行中重构：将客户与联系人迁移至独立表 `customers` 与 `contacts`，并引入 `usage_count` 与 `last_used` 便于排序与统计（详见 [tasks/todo.md](../tasks/todo.md)）。

## 重要约束（Important Constraints）
- 操作系统：主要在 Windows 环境开发与运行。
- 数据一致性：
	- 日期格式统一为 `YYYY-MM-DD`（ISO 8601）。
	- `jobs(unique_key)` 唯一约束确保作业唯一性。
	- 统一启用 SQLite 外键与事务隔离策略（见 [src/lib/db.js](../src/lib/db.js)）。
- 访问约束：所有数据库访问必须通过单例 `getDB()`，禁止直接实例化 `Database` 于业务代码。
- 最小改动原则：代码更改尽量小且聚焦于需求，避免引入无关风险（团队约定）。
- Node 原生模块兼容：升级 Node 版本后需 `npm rebuild` 以确保 `better-sqlite3` 的二进制绑定兼容。

## 外部依赖（External Dependencies）
- UI/组件生态：MUI、Emotion、TanStack React Query、Dayjs。
- 数据库：`better-sqlite3`（本地 SQLite 文件位于 `data/jobs.db`）。
- 文件系统：依赖本地/网络文件夹路径（见 `customer_folder_map` 与 `file_location` 字段），用于图纸与文档定位。

## 运行与运维（Operations）
- 开发启动：`npm run dev` 后访问 `http://localhost:3000`。
- 构建与启动：`npm run build`，`npm run start`。
- 数据库初始化与迁移：
	- 初始化：`npm run db:init`
	- 迁移：`npm run db:migrate`
	- 回滚：`npm run db:migrate:down`
	- 状态：`npm run db:migrate:status`
- 常见问题：如果 `scripts/check-db.js` 报错 `NODE_MODULE_VERSION` 不匹配，请执行 `npm rebuild` 或重新安装依赖以重编译 `better-sqlite3`。

## 参考文件（Quick Links）
- 技术与配置：[package.json](../package.json)、[next.config.mjs](../next.config.mjs)、[eslint.config.mjs](../eslint.config.mjs)、[jsconfig.json](../jsconfig.json)
- 数据访问：[src/lib/db.js](../src/lib/db.js)
- API 路由示例：[src/pages/api/jobs/index.js](../src/pages/api/jobs/index.js)
- 数据结构概览：[data/structure.txt](../data/structure.txt)
- 任务与重构计划：[tasks/todo.md](../tasks/todo.md)
