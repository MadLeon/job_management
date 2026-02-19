# Manufacturing Process - Link 过程实现计划

## 总体目标

实现 Manufacturing Process.xlsm 中的 Link 过程，根据 drawing number (J7) 查找并关联 drawing_file 记录，更新数据库。

---

## 工作计划

### 第一阶段：需求分析与设计

- [ ] 1.1. 确认数据库表结构和查询策略
- [ ] 1.2. 设计 VBA 代码模块结构
- [ ] 1.3. 确认 Excel 界面设计（X 列显示位置、radio选择、超链接等）

### 第二阶段：实现数据库查询模块

- [ ] 2.1. 创建 QueryDrawingFile 函数（查询 part 表）
- [ ] 2.2. 创建 FindDrawingFile 函数（查询 drawing_file 表）
- [ ] 2.3. 创建智能排序函数（基于 is_active, file_path 中的 PO, last_modified）

### 第三阶段：实现 UI 显示模块

- [ ] 3.1. 创建 DisplayResults 函数（在 X 列显示结果）
- [ ] 3.2. 实现 radio 单选按钮和默认选择
- [ ] 3.3. 实现超链接和 Acrobat 打开功能

### 第四阶段：实现 Link 按钮逻辑

- [ ] 4.1. 创建 UpdateDrawingFileStatus 函数（更新 is_active 字段）
- [ ] 4.2. 创建 UpdatePartMapping 函数（更新 part_id 字段）
- [ ] 4.3. 实现错误处理和异常情况

### 第五阶段：集成与测试

- [ ] 5.1. 集成 Fetch 按钮调用
- [ ] 5.2. 集成 Link 按钮调用
- [ ] 5.3. 测试各种场景（找到一条、多条、零条等）
- [ ] 5.4. 实现文本输出（T8 单元格的成功/失败消息）

---

## 关键细节

### 数据库查询策略

1. 在 part 表查找 J7 的值 → 记录 part.id
2. 在 drawing_file 表查找：
   - file_name 包含 J7 值的所有记录
   - 按优先级排序：
     - 首选：is_active = 1 的记录（唯一）
     - 次选：file_path 包含 PO (B7) 的最新记录
     - 默认：last_modified 最新的记录

### Excel 界面

- **显示位置**: X 列，从第 2 行开始
- **每行内容**: `☐ 文件路径 (创建日期)` 或类似格式
- **默认选中**: 最优先的记录对应的 radio 应被选中
- **超链接**: 点击路径应用 Acrobat 打开文件

### 数据库更新

- 选中的记录：is_active = 1
- 其他列出的记录：is_active = 0
- 如果 part_id 为空：更新为找到的 part.id

---

## 输出位置

- **状态消息**: T8 单元格
- **成功**: "Link successful"
- **失败**: "Drawing not found" 或相关错误信息
- **图片复制**: 从 data sheet Picture 1 → Sheet1 S7（S8 需要确认具体单元格）

---

## 下一步

等待用户确认此计划，然后开始第一阶段的工作。
