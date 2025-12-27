# 验证与测试指南

## 数据库迁移验证

```bash
# 1. 运行迁移
npm run db:migrate

# 2. 检查迁移状态
npm run db:migrate:status

# 3. 验证表结构
node scripts/check-db.js
```

预期输出：应看到 `customers` 和 `contacts` 表已创建，并包含回填数据。

## API 验证

### 获取客户列表
```bash
curl http://localhost:3000/api/customers
```

预期：返回按 `usage_count` 降序、`customer_name` 升序的活跃客户列表。

### 获取联系人列表
```bash
curl "http://localhost:3000/api/contacts?customer_name=MHI-Canada"
```

预期：返回按 `usage_count` 降序、`contact_name` 升序的联系人列表，按客户名过滤。

### 创建作业并更新使用计数
```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "job_number": "12345",
    "line_number": "1",
    "customer_name": "MHI-Canada",
    "customer_contact": "Lana Bozic",
    "part_number": "GM223-1314-9"
  }'
```

预期：创建新作业，并自动递增对应客户与联系人的 `usage_count`、更新 `last_used`。

## 前端验证

1. 打开 `http://localhost:3000/active-jobs` 
2. 查看"Select Client"过滤器：应显示排序后的客户列表（从 API 获取，按使用次数降序）
3. 选择一个客户后，"Select Contact"过滤器应显示该客户的联系人（排序一致）
4. 加载状态与错误提示应正确显示

## 排序验证

- 多个客户/联系人具有相同 `usage_count` 时，按名称字母升序
- 不区分大小写的排序（例如 "abc" 与 "ABC" 排序相同）
- 软删除（`is_active = 0`）的记录不出现在列表中
