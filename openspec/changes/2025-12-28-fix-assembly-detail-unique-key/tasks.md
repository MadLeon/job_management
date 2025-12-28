# 任务拆解

1. 新增变更迁移脚本，向 assembly_detail 表添加 unique_key 字段
2. 编写数据补全脚本，遍历 assembly_detail，查找 jobs 表中对应 part_number，填充 unique_key
3. 验证所有 assembly_detail 记录均已正确补全 unique_key
4. 更新相关 API/查询逻辑，支持按 unique_key 查询装配明细（如有必要）
5. 使用jest编写/更新测试用例，确保数据唯一性和完整性
6. 编写 spec delta，详细列出需求和场景
7. 变更文档和设计说明（如需）
