# 作业管理系统 - AI 编码代理指南

## 架构概览

这是一个 **Next.js 16 制造业作业管理应用程序**（仅限 Pages Router），使用 SQLite 数据库跟踪作业、客户、装配件和生产工作流程。系统通过 API 路由进行服务器端数据库操作，并使用客户端 React Query 进行状态同步。

**第一优先级：**

- 非常重要: Agent 的所有回复消息都必须使用简体中文。
- Agent 生成的所有代码均使用 JSDoc 风格注释
- 每个会话开始前, 阅读 structure.txt 并运行 `scripts/check-db.js` 来建立对数据库的了解

**技术栈：**

- **前端**: React 19.2, Next.js 16 (Pages Router), Material-UI v7, Emotion CSS-in-JS
- **后端**: Next.js API Routes (Node.js runtime), better-sqlite3 v12.5 for SQLite
- **状态管理**: TanStack React Query v5 (5min staleTime, 10min gcTime), local React state for UI
- **数据库**: SQLite at `data/jobs.db`, versioned migrations in `scripts/migrations/`

## 关键架构模式

### 数据库层 ([src/lib/db.js](src/lib/db.js))

- **单例模式**: `getDB()` 返回缓存实例；必须在所有 API 路由中导入
- **数据库路径**: 使用 `process.env.DB_PATH || path.join(process.cwd(), 'data', 'jobs.db')`
  - ⚠️ **关键**: 使用 `process.cwd()` 而不是 `__dirname` (Next.js 编译特性)
- **Pragmas** 配置: `journal_mode = DELETE`, `foreign_keys = ON`, `transaction_isolation = IMMEDIATE`
- **数据库初始化** 在 `src/lib/db.js` 中，首次调用 `getDB()` 时自动运行
- 所有查询使用 `.prepare().all()`, `.run()`, 或 `.get()` - 仅限同步操作

### API 路由模式 ([src/pages/api/jobs/](src/pages/api/jobs/))

- **处理函数**: 每个文件中包含 `export default function handler(req, res)`
- **数据库导入**: 在顶部导入 `import getDB from '@/lib/db'`
- **结构**: GET 请求在 `index.js`，变更操作在 `update.js`，详细操作在 `*-create.js|update.js|delete.js`
- **错误处理**: `try-catch` 包装所有数据库操作，响应 `{ error: message }` 和状态码 500
- **方法验证**: 检查 `req.method` 并对不支持的方法响应 405
- **响应格式**: JSON 及状态码 (200 OK, 405 Method Not Allowed, 500 Server Error)

### 前端状态管理

- **React Query**: 在 [src/lib/queryClient.js](src/lib/queryClient.js) 中配置 stale/gc 时间
  - 默认: `staleTime: 5min, gcTime: 10min`
  - 在 `_app.js` 中导入 `queryClient`，使用 `QueryClientProvider` 包装
- **本地 UI 状态**: React hooks 用于抽屉展开、表单可见性、模态框打开/关闭
- **数据获取**: 使用 `useQuery` 读取，`useMutation` 写入
- **缓存失效**: 变更后调用 `queryClient.invalidateQueries()` 刷新

### 组件架构

应用采用模块化组件结构，按功能领域组织。所有组件使用 Material-UI v7 和 Emotion CSS-in-JS 构建。

#### 布局组件 ([src/components/layout/](src/components/layout/))

核心应用框架和导航组件：

- **`AppHeader.jsx`**: 顶部导航栏，包含应用标题、搜索、用户菜单
- **`Sidebar.jsx`**: 可折叠侧边栏导航，集成路由匹配和动画过渡
- **`DashboardSidebarPageItem.jsx`**: 侧边栏菜单项组件，支持嵌套和激活状态
- **模态框组件**:
  - `JobEditModal.jsx` - 作业编辑模态框（包装 JobForm）
  - `CreateJobModal.jsx` - 新建作业模态框
  - `PartEditModal.jsx` - 零件/装配编辑模态框
  - `Modal.jsx` - 通用模态框基础组件

#### 表单组件 ([src/components/forms/](src/components/forms/))

可复用的数据输入表单：

- **`JobForm.jsx`**: 作业创建/编辑主表单，支持客户选择、日期、优先级、文件上传
- **`PartEditForm.jsx`**: 零件详情编辑表单，用于装配明细维护

#### 表格组件 ([src/components/table/](src/components/table/))

数据展示和交互表格：

- **`JobTable.jsx`**: 作业列表主表格容器
- **`JobTableRow.jsx`**: 单行作业数据展示，支持点击展开
- **`JobDetailRow.jsx`**: 可展开的作业详情行，显示装配信息、历史记录等

#### 通用组件 ([src/components/common/](src/components/common/))

跨功能可复用组件：

- **`ActionButtonList.jsx`**: 动作按钮列表（编辑、删除、打印等）
- **`actionButtonConfig.js`**: 按钮配置和图标映射
- **`BottomButtonGroup.jsx`**: 页面底部操作按钮组
- **`Breadcrumbs.jsx`**: 面包屑导航
- **`DeleteConfirmDialog.jsx`**: 删除确认对话框
- **`PageTitle.jsx`**: 页面标题组件
- **`OpenInNewLink.jsx`**: 新窗口打开链接组件
- **`UserCard/`**: 用户信息卡片组件

#### 详情容器组件 ([src/components/itemContainer/](src/components/itemContainer/))

作业详情页面的模块化信息展示组件：

- **`JobInformation.jsx`**: 作业基本信息卡片
- **`DrawingDocumentation.jsx`**: 图纸文档信息展示
- **`DocumentationHistory.jsx`**: 文档变更历史
- **`ProductionHistory.jsx`**: 生产历史记录
- **`AdditionalJobInfo.jsx`**: 额外作业信息
- **`Timeline.jsx`**: 作业时间线可视化
- **`JobCompletionChart.jsx`**: 作业完成度图表
- **`QRCodeDisplay.jsx`**: 二维码显示
- **`Notes.jsx`**: 备注和注释组件
- **`InfoField.jsx`**: 通用信息字段展示组件
- **`ContainerTitle.jsx`**: 容器标题组件
- **`ProfileInformation.jsx`**: 配置信息展示

#### 共享 UI 组件 ([src/components/shared/](src/components/shared/))

底层可复用 UI 元素：

- 徽章 (Badges)、芯片 (Chips)、卡片 (Cards) 等通用 UI 组件
- 遵循统一的视觉设计语言和主题配置

#### 搜索组件 ([src/components/search/](src/components/search/))

全局和局部搜索功能组件

#### UI 组件库 ([src/components/ui/](src/components/ui/))

自定义 UI 基础组件和样式扩展

**组件使用原则**:

- 优先使用 `common/` 中的通用组件保持一致性
- 表单提交统一通过 React Query mutations 处理
- 所有模态框使用 Material-UI `Dialog` 组件
- 样式通过 `sx` 属性应用，避免单独 CSS 文件
- 组件间通信优先使用 Context API（如 `DashboardSidebarContext`）

### 侧边栏导航模式

- **组件**: [src/components/layout/Sidebar.jsx](src/components/layout/Sidebar.jsx) 带可折叠抽屉
- **状态跟踪**: `DashboardSidebarContext.js` 存储展开/折叠状态
- **路由匹配**: 使用来自 [src/helpers/matchPath.js](src/helpers/matchPath.js) 的 `matchPath()` 辅助函数
- **动画**: 来自 [src/helpers/mixins.js](src/helpers/mixins.js) 的过渡混合
  - 使用 `getDrawerSxTransitionMixin(isExpanded, property)` 实现平滑抽屉过渡

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

**当前迁移**: 001-013 已存在，包含优先级、图纸元数据、装配详情、文件位置、日期标准化等功能

### 表结构

**核心表**:

- **jobs**: 主表 (332+ 条记录)
  - 标识: `job_id`, `oe_number`, `job_number`, `unique_key`
  - 基本信息: `customer_name`, `part_number`, `revision`, `part_description`, `job_quantity`
  - 日期: `drawing_release`, `delivery_required_date`, `delivery_shipped_date` (YYYY-MM-DD)
  - 状态: `priority` (TEXT), `has_assembly_details` (INTEGER)
  - 业务: `po_number`, `line_number`, `unit_price`, `packing_slip`, `invoice_number`
  - 元数据: `file_location`, `create_timestamp`, `last_modified`
- **detail_drawing**: 图纸元数据 (drawing_number, description, revision, isAssembly)
- **assembly_detail**: 装配行详情 (链接到 job_id)
- **job_history**: 作业历史记录
- **drawings**: 图纸信息表
- **assemblies**: 装配件表
- **customer_folder_map**: 客户文件夹映射

**关键约定**:

- 所有日期字段统一使用 **YYYY-MM-DD** 格式
- 时间戳使用 `datetime('now','localtime')`
- 外键约束启用 (`foreign_keys = ON`)

### 关键命令

- **`npm run dev`** - 开发服务器，支持热重载 (http://localhost:3000)
- **`npm run build`** - 生产构建
- **`npm run lint`** - 运行 ESLint (在 `eslint.config.mjs` 中配置)
- **数据库命令**:
  - `npm run db:migrate` - 应用待处理的迁移
  - `npm run db:migrate:down` - 回滚最后一次迁移
  - `npm run db:migrate:status` - 显示迁移状态
  - `npm run db:init` - 从头重新初始化数据库

### 测试与调试

**数据库检查**:
- `node scripts/check-db.js` - 快速查看表结构、记录数和样本数据
- `node scripts/test-db.js` - 执行数据库操作测试
- `node scripts/check-sqlite-version.js` - 验证 better-sqlite3 版本

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
- **优先级**: 从 [data/data.js](data/data.js) 导入为 `priorityOptions` 对象: `Critical`, `Urgent`, `Important`, `Normal`, `Minor`, `Hold`
- **日期格式**: 内部使用 **YYYY-MM-DD** 格式 (参见 `JobForm.jsx` 中的 `formatDateForInput()`)
- **API 响应**: 始终返回 JSON；使用一致的错误形状: `{ error: string }` 及适当的 HTTP 状态

### UI/样式

- **间距**: Material-UI 间距系统 (theme breakpoints, sx prop)
- **颜色**: 主要蓝色 `#03229F`，在 [src/theme.js](src/theme.js) 中定义的自定义深红/橙色调色板
- **排版变体**: 在主题中定义的 `regularBold`, `grayCaption`, `h1`, `h2` (参见 [src/theme.js](src/theme.js))
- 通过 MUI 组件的 `sx` 属性使用 Emotion CSS-in-JS，而不是单独的 CSS 文件

### 错误处理

- **API 路由**: 始终在 try-catch 中包装数据库调用，返回状态码 (200, 405, 500)
- **前端**: React Query 处理异步错误，向用户显示提示/对话框
- **日志记录**: 记录带上下文的错误: `console.error('Operation:', error)`
- **数据库**: 连接失败在 `getDB()` 中处理，带控制台日志记录

## 关键集成点

1. **API → 数据库**: 所有 `/api/jobs/*` 路由必须导入 `getDB()` 并使用预处理语句
2. **前端 → API**: 使用 React Query 及适当的 hooks (useQuery, useMutation)
3. **表单 → API**: `JobForm.jsx` 提交到 `/api/jobs/update.js`，处理响应验证
4. **装配详情**: 通过 `assembly_detail_*` 路由链接，并反映在 `jobs.has_assembly_details` 标志中
5. **文件位置**: `drawing-file-location.js` API 用于管理文件路径，在 UI 中显示

## 重要注意事项

- **数据库路径**: 始终使用 `process.cwd()` 而不是 `__dirname` 查找项目根目录 (Next.js 编译特性)
- **Next.js Pages Router**: 路由在 `src/pages/`，而不是 `src/app/`；没有特殊处理不能使用动态 `[param]` 语法
- **React Query stale 时间**: 默认 5 分钟 - 考虑何时需要新鲜数据刷新
- **迁移顺序**: 序号前缀很重要；如果添加迁移，从最后应用的迁移递增
- **主题提供者**: 在 `_app.js` 中使用 `CacheProvider` 包装以支持 Emotion SSR
- **数据库单例**: 绝不创建多个 Database 实例；始终使用 `getDB()`

## 文件结构参考

- **API 层**: `src/pages/api/*` - 所有数据库操作
- **组件**: `src/components/` - 按功能组织的 UI
- **数据库访问**: `src/lib/db.js` - 单例，绝不在其他地方直接导入 Database
- **实用工具**: `src/helpers/` - 过渡混合、路径匹配、共享函数
- **数据库模式**: `scripts/migrations/` 中的迁移 - 每个功能一个
- **配置**: `next.config.mjs` (Next.js), `theme.js` (MUI), `queryClient.js` (React Query)
- **数据库结构**: `data/structure.txt`
