# 修复 Subscript Out of Range 错误 (2026-02-19)

## 问题根源

ExecuteQuery 返回值结构与数据访问方式不一致，导致"Subscript out of range"错误

### 错误日志

```
[2026-02-19 14:48:09] [ERROR] Error in QueryDrawingFiles: Subscript out of range
[2026-02-19 14:48:09] [ERROR] Error in QueryPartByDrawingNumber: Subscript out of range
```

## 根本原因分析

- ExecuteQuery 原本返回一维 Variant 数组，其中每个元素是包含列值的数组
- 但代码在多个地方试图通过属性访问（如 `resultsArray(i).file_name`）
- 这与 session 3 的修改（改用 Variant 数组）不一致

## 修复方案

### 1️⃣ sqlite.bas - ExecuteQuery 函数

**修改内容**: 改为返回真正的 2D 数组，而不是数组的数组

- 删除 `row()` 数组变量
- 改为直接写入 `results(rowNum, colNum)`
- 使用 `ReDim Preserve results(0 To rowNum, 0 To colCount - 1)` 扩展 2D 数组
- **结果**: 返回 `(rowCount, colCount)` 的真 2D 数组

### 2️⃣ mod_DrawingFileDisplay.bas - DisplayQueryResults 子程序

**修改内容**: 改用 2D 数组索引访问

- `resultsArray(i).file_name` → `resultsArray(i, 2)`
- `resultsArray(i).file_path` → `resultsArray(i, 3)`
- `resultsArray(i).id` → `resultsArray(i, 0)`
- `resultsArray(i).part_id` → `resultsArray(i, 1)`
- `UBound(resultsArray) + 1` → `UBound(resultsArray, 1) + 1` (2D 数组访问)

### 3️⃣ mod_GlobalState.bas - GetStoredResult 函数

**修改内容**: 修复从 2D 数组提取行的方式

- 不能直接用 `m_lastResults(index)` 从 2D 数组提取行
- 改为创建 1D 数组副本，逐列复制该行的数据
- 返回 1D 数组供 LinkDrawingFile_Main 使用

### 4️⃣ mod_DrawingFileLink.bas（无需修改）

- 代码已正确使用 2D 数组索引访问（`lastResults(i, 0)` 等）
- 通过 GetStoredResult 获取行后，转换为 1D 数组，使用 `selectedResult(0)` 等访问

## 字段列索引映射

从 QueryDrawingFiles SQL 查询返回：

- 0: id (drawing_file.id)
- 1: part_id
- 2: file_name
- 3: file_path
- 4: is_active
- 5: last_modified_at
- 6: revision
- 7: priority（由 QueryDrawingFiles 添加）

## 测试步骤

1. 打开 Manufacturing Process.xlsx
2. 在J7输入drawing number：`RT-88000-70097-045-1-DD-C`
3. 点击 **Fetch** 按钮
4. 检查mp_log.txt是否有错误
5. 检查X列是否显示查询结果（如果有匹配）
6. 若显示结果，选中一个并点击 **Link** 按钮
7. 检查成功/失败消息

## 预期结果

- ✅ 不再出现"Subscript out of range"错误
- ✅ 数据库查询正常执行
- ✅ 结果在X列正确显示
- ✅ 最佳匹配被高亮和默认选中
