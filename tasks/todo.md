# 客户和联系人数据库重构 - 任务清单

---

## 组件重构：将 layout 中的 modal 移至 components/modals

- [x] 确认目标文件：Modal.jsx, PartEditModal.jsx, JobEditModal.jsx, CreateJobModal.jsx（位于 src/components/layout）
- [x] 创建目录：src/components/modals
- [x] 复制并迁移 4 个文件到新目录
- [x] 更新外部导入：将所有 `@/components/layout/JobEditModal` 更新为 `@/components/modals/JobEditModal`
- [x] 为旧文件添加兼容性导出（layout/Modal.jsx, layout/PartEditModal.jsx, layout/CreateJobModal.jsx）
- [x] 运行错误检查，确保无编译/导入错误

### Review（本次改动）

- 更改文件：
  - 新增：[src/components/modals/Modal.jsx](src/components/modals/Modal.jsx), [src/components/modals/PartEditModal.jsx](src/components/modals/PartEditModal.jsx), [src/components/modals/JobEditModal.jsx](src/components/modals/JobEditModal.jsx), [src/components/modals/CreateJobModal.jsx](src/components/modals/CreateJobModal.jsx)
  - 更新导入：[src/pages/active-jobs/index.jsx](src/pages/active-jobs/index.jsx#L9)
  - 兼容性导出：更新 [src/components/layout/Modal.jsx](src/components/layout/Modal.jsx), [src/components/layout/PartEditModal.jsx](src/components/layout/PartEditModal.jsx), [src/components/layout/CreateJobModal.jsx](src/components/layout/CreateJobModal.jsx)
- 说明：保留 `layout/JobEditModal.jsx` 原文件未改动以避免大范围补丁失败；当前页面已改为使用新路径，旧文件可后续清理。

---

## 项目概述

将客户和联系人管理从硬编码的 `customerList` 数组迁移到数据库系统，采用方案一（独立表）+ 方案二的 `usage_count` 字段。

---

## 第一阶段：数据库迁移与 API

### 1. 数据库表结构创建

- [ ] 创建迁移文件：`014_create_customers_table.js`

  - 表结构：customers (customer_id, customer_name, pdf_folder_path, is_active, usage_count, last_used, created_at, updated_at)
  - 从现有 `customer_folder_map` 迁移数据
  - 初始化 usage_count = 0，last_used = NULL

- [ ] 创建迁移文件：`015_create_contacts_table.js`

  - 表结构：contacts (contact_id, contact_name, customer_name, usage_count, last_used, is_active, created_at, updated_at)
  - 从现有 jobs 表的 customer_contact 字段提取唯一联系人
  - 建立与 customers 表的关联
  - 初始化 usage_count = 0，last_used = NULL

- [ ] 创建迁移文件：`016_populate_customer_usage_count.js`

  - 统计每个客户在 jobs 和 job_history 中出现的次数
  - 更新 customers 表的 usage_count 字段
  - 更新 last_used 为最新的工作日期

- [ ] 创建迁移文件：`017_populate_contact_usage_count.js`
  - 统计每个联系人在 jobs 和 job_history 中出现的次数
  - 更新 contacts 表的 usage_count 字段
  - 更新 last_used 为最新的工作日期

### 2. API 端点开发

#### 客户相关 API

- [ ] `GET /api/customers` - 获取所有活跃客户列表（支持排序）

  - 查询参数：sort (name|usage|recent), order (asc|desc)
  - 返回：{ customers: [], total: number }

- [ ] `GET /api/customers/:id` - 获取单个客户详情及其联系人

- [ ] `POST /api/customers` - 创建新客户

  - 参数：{ customer_name, pdf_folder_path }
  - 返回：{ customer_id, customer_name, ... }

- [ ] `PUT /api/customers/:id` - 更新客户信息

  - 参数：{ customer_name, pdf_folder_path, is_active }

- [ ] `DELETE /api/customers/:id` - 软删除客户（设置 is_active = 0）

#### 联系人相关 API

- [ ] `GET /api/contacts` - 获取所有活跃联系人（支持按客户筛选）

  - 查询参数：customer_id, sort, order
  - 返回：{ contacts: [], total: number }

- [ ] `GET /api/contacts?customer_name=<name>` - 按客户名称获取其联系人

- [ ] `POST /api/contacts` - 创建新联系人

  - 参数：{ contact_name, customer_name }

- [ ] `PUT /api/contacts/:id` - 更新联系人信息

  - 参数：{ contact_name, is_active }

- [ ] `DELETE /api/contacts/:id` - 软删除联系人

#### 统计相关 API

- [ ] `PUT /api/customers/:id/usage` - 更新客户使用统计

  - 自动增加 usage_count，更新 last_used

- [ ] `PUT /api/contacts/:id/usage` - 更新联系人使用统计

---

## 第二阶段：前端组件更新

### 3. 数据获取 Hooks

- [ ] 创建 `src/lib/hooks/useCustomers.js`

  - 支持多种排序方式（字母、使用频率、最近使用）
  - 缓存和实时更新

- [ ] 创建 `src/lib/hooks/useContacts.js`
  - 支持按客户筛选
  - 支持多种排序方式

### 4. 筛选器组件更新

- [ ] 更新 `ClientAutocomplete.jsx`

  - 从 API 获取客户列表
  - 支持多种排序选项
  - 优化搜索性能（防抖）

- [ ] 更新 `ContactAutocomplete.jsx`

  - 从 API 获取联系人列表
  - 根据选中的客户动态过滤联系人
  - 支持多种排序选项

- [ ] 更新 `FilterPopover.jsx`
  - 添加排序选项 UI（可选）
  - 记住用户的排序偏好（localStorage）

### 5. 筛选结果应用

- [ ] 更新 `applyFilters()` 逻辑
  - 应用筛选后更新 customers/contacts 的 usage_count
  - 记录 last_used 时间

---

## 第三阶段：管理界面（后续）

### 6. 客户管理页面

- [ ] 创建 `src/pages/settings/customers.jsx` 或集成到现有 settings
  - 显示所有客户列表（含使用统计）
  - 添加/编辑/删除客户
  - 批量操作（导入、合并、启用/禁用）

### 7. 联系人管理页面

- [ ] 创建 `src/pages/settings/contacts.jsx`
  - 按客户组织显示联系人
  - 添加/编辑/删除联系人
  - 设置主要联系人

---

## 第四阶段：数据一致性与集成

### 8. Jobs 表更新（可选，后续决定）

- [ ] 考虑在 jobs 表添加外键：customer_id, contact_id
  - 目前保留 customer_name 和 customer_contact 兼容性
  - 新增记录使用外键关联

### 9. 向后兼容性

- [ ] 确保现有的 jobs 表查询仍可用
- [ ] 提供数据迁移脚本供需要的地方使用

### 10. 数据验证与测试

- [ ] 测试迁移脚本的数据完整性
- [ ] 验证 usage_count 统计正确性
- [ ] 测试所有 API 端点
- [ ] 前端集成测试

---

## 审查与总结

### Review Section（完成后填写）

- [ ] 所有迁移脚本已执行
- [ ] 所有 API 端点已测试
- [ ] 前端组件已更新并测试
- [ ] 数据一致性已验证
- [ ] 文档已更新

**总结：**
（完成后编写）

---

## 相关文件清单

### 待创建文件

```
scripts/migrations/014_create_customers_table.js
scripts/migrations/015_create_contacts_table.js
scripts/migrations/016_populate_customer_usage_count.js
scripts/migrations/017_populate_contact_usage_count.js

src/pages/api/customers/index.js
src/pages/api/customers/[id].js
src/pages/api/customers/[id]/usage.js

src/pages/api/contacts/index.js
src/pages/api/contacts/[id].js
src/pages/api/contacts/[id]/usage.js

src/lib/hooks/useCustomers.js
src/lib/hooks/useContacts.js
```

### 待修改文件

```
src/components/search/ClientAutocomplete.jsx
src/components/search/ContactAutocomplete.jsx
src/components/search/FilterPopover.jsx
data/data.js (删除或保留 customerList)
```

---

## 设计决策记录

1. **软删除策略**：使用 is_active 字段而非硬删除，保持数据历史完整性
2. **使用统计**：tracking usage_count 和 last_used，便于排序和分析
3. **外键关联**：contacts 通过 customer_name 与 customers 关联（字符串 FK，便于迁移）
4. **兼容性**：保留现有 jobs 表结构，不强制立即迁移
5. **排序方式**：支持字母、使用频率、最近使用三种排序，默认字母顺序
