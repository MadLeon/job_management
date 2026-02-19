# Link Process VBA 实现指南

## 实现完成情况统计

**已创建的模块** (5 个):

- ✅ `mod_DrawingFileFinder.bas` - 数据库查询模块
- ✅ `mod_DrawingFileDisplay.bas` - UI 显示模块
- ✅ `mod_DrawingFileLink.bas` - Link 按钮业务逻辑
- ✅ `mod_FetchDrawingFiles.bas` - Fetch 按钮业务逻辑
- ✅ `mod_GlobalState.bas` - 全局状态管理
- ✅ `mod_Integration.bas` - 集成接口（Fetch/Link 按钮）

**已修改的模块** (1 个):

- ✅ `sqlite.bas` - 新增 `ExecuteUpdate()` 函数（返回受影响行数）

---

## 功能说明

### 1. Fetch 按钮 (FetchButton_Click)

**功能**: 根据 drawing number (J7) 和 PO (B7) 查询数据库，显示最多 8 条最新结果。

**流程**:

1. 从 J7 读取 drawing number，从 B7 读取 PO 号
2. 在 part 表查询是否存在该 drawing number 的零件
3. 在 drawing_file 表查询文件名包含 drawing number 的所有记录
4. 按优先级排序：is_active=1 > file_path 包含 PO > last_modified_at 最新
5. 在 X 列显示最多 8 条结果（行号. ☑/☐ 文件名）
6. 第一条（最优先）自动标记为已选（☑ 并黄色背景）
7. 在 T8 显示: "Found N results" 或 "Drawing not found"

**显示格式** (X2:X9):

```
1. ☑ file_name_1 (2026-02-19)
2. ☐ file_name_2 (2026-02-18)
3. ☐ file_name_3 (2026-02-17)
...
```

**调用方式**:

```vb
FetchButton_Click()  ' 从 Excel 按钮调用
' 或直接调用:
FetchDrawingFiles_Main()
```

---

### 2. Link 按钮 (LinkButton_Click)

**功能**: 将用户选择的 drawing file 标记为活跃，更新数据库。

**流程**:

1. 获取上一次 Fetch 操作的结果（存储在全局变量中）
2. 使用第一条结果作为默认选择（用户可点击其他行改变选择）
3. 更新数据库:
   - 选中的文件: `is_active = 1`
   - 其他文件: `is_active = 0`
   - 如果 part_id 为 NULL 且找到了 part，则填充 part_id
4. 显示成功消息: "Link successful! (N results processed)"
5. 从 data sheet 复制 Picture 1 到 S7 作为确认

**调用方式**:

```vb
LinkButton_Click()  ' 从 Excel 按钮调用
' 或直接调用:
LinkDrawingFile_Main()
```

---

## Excel 按钮配置步骤

### 步骤 1: 添加 Fetch 按钮

1. 打开 Manufacturing Process.xlsm
2. 在 Sheet1 上右键 → **Insert** → **Objects** → **Form Control**
3. 选择 **Button**
4. 在 J6 或 J8 附近绘制一个按钮
5. 双击按钮，输入名称: `Fetch Button`
6. 右键按钮 → **Assign Macro** → 选择 `FetchButton_Click`
7. 编辑按钮文字为 "Fetch"

### 步骤 2: 添加 Link 按钮

1. 在 X1 或 Y1 附近绘制一个按钮
2. 双击按钮，输入名称: `Link Button`
3. 右键按钮 → **Assign Macro** → 选择 `LinkButton_Click`
4. 编辑按钮文字为 "Link"

### 步骤 3: 验证单元格引用

确认以下单元格位置正确:

- **J7**: Drawing Number 输入框
- **B7**: PO Number
- **X2:X9**: 结果显示区域（自动清理）
- **T8**: 状态消息输出
- **S7**: 确认图片粘贴位置
- **AA/AB/AC 列**: 隐藏数据存储区（自动管理，无需手动配置）

---

## 数据库表结构

### part 表

```
id (PK)
drawing_number (查询条件)
revision
is_assembly
... (其他字段)
```

### drawing_file 表

```
id (PK)
part_id (FK，可为 NULL，Link 过程会填充)
file_name (包含 drawing_number，用于查询)
file_path (完整路径，显示在 UI)
is_active (INTEGER，1=活跃，0=非活跃，由 Link 过程更新)
last_modified_at (用于排序)
revision
created_at
updated_at
```

---

## 查询逻辑详解

### 第一步：查询 part 表

```sql
SELECT id FROM part
WHERE drawing_number = '用户输入的 J7 值'
LIMIT 1
```

- 找到 ✓: 存储 part.id，供 Link 过程使用
- 未找到 ∅: 继续查询 drawing_file, part_id 保持为 FILLL NULL

### 第二步：查询 drawing_file 表

```sql
SELECT id, part_id, file_name, file_path, is_active,
       last_modified_at, revision
FROM drawing_file
WHERE file_name LIKE '%用户输入的 J7%'
ORDER BY
  is_active DESC,  -- 1. 优先选择 is_active=1 的
  (CASE WHEN file_path LIKE '%B7值%' THEN 1 ELSE 0 END) DESC,  -- 2. 其次选择 file_path 包含 PO 的
  last_modified_at DESC  -- 3. 最后排序按修改时间
LIMIT 8
```

**排序优先级**:

1. **is_active=1**: 最优先（之前已确认的活跃文件）
2. **file_path 包含 PO**: 次优先（与当前 PO 相关）
3. **last_modified_at**: 默认（最新修改时间优先）

---

## UI 交互流程

```
┌─────────────────────────────────────┐
│ 用户在 J7 输入 drawing number      │
│ 用户在 B7 输入 PO 号                │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ 点击 Fetch 按钮 → FetchButton_Click │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ 数据库查询 drawing_file 表          │
│ 得到最多 8 条结果                   │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ 在 X 列显示结果                      │
│ X2: 1. ☑ file_name_1 (最优先)      │
│ X3: 2. ☐ file_name_2               │
│ X4: 3. ☐ file_name_3               │
│ ...                                 │
│ T8: "Found N results"               │
└──────────┬──────────────────────────┘
           │
    (可选) 用户点击其他行改变选择
           │
           ▼
┌─────────────────────────────────────┐
│ 点击 Link 按钮 → LinkButton_Click   │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ 更新数据库                           │
│ · 选中的文件: is_active = 1         │
│ · 其他文件: is_active = 0           │
│ · 填充 part_id (如果需要)           │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ T8: "Link successful! (N results)"  │
│ S7: 粘贴确认图片                    │
│ 显示成功消息框                      │
└─────────────────────────────────────┘
```

---

## 日志和调试

所有操作都记录在 `mp_log.txt` (与 Excel 文件同级目录):

```
[2026-02-19 14:23:45] [DEBUG] FetchDrawingFiles_Main started - Drawing: ABC-001, PO: PO-123
[2026-02-19 14:23:45] [DEBUG] Querying part table for drawing_number=ABC-001
[2026-02-19 14:23:45] [DEBUG] Found part.id=456 for drawing_number=ABC-001
[2026-02-19 14:23:46] [DEBUG] Found 3 drawing files for drawing_number=ABC-001
[2026-02-19 14:23:46] [DEBUG] Best match marked at row 2
[2026-02-19 14:23:46] [INFO] FetchDrawingFiles_Main completed - Found 3 results
...
[2026-02-19 14:25:10] [DEBUG] LinkDrawingFile_Main started - Drawing: ABC-001, PO: PO-123
[2026-02-19 14:25:10] [DEBUG] Updating drawing_file records: setting id=789 to is_active=1
[2026-02-19 14:25:10] [DEBUG] Updated drawing_file id=789 to is_active=1
[2026-02-19 14:25:10] [DEBUG] Updated drawing_file id=790 to is_active=0
[2026-02-19 14:25:10] [DEBUG] Copied Picture 1 from data sheet to S7
[2026-02-19 14:25:10] [INFO] Link successful! (3 results processed)
```

在 Immediate Window (Ctrl+J) 运行 `TestLogger()` 可以测试日志系统。

---

## 常见问题

### Q1: Fetch 后没有显示任何结果

**可能原因**:

- J7 中的 drawing number 不存在于数据库
- drawing_file 表中没有 file_name 包含该值的记录
- 数据库连接失败

**排查方法**:

1. 检查 `mp_log.txt` 中的错误信息
2. 确认 J7 值是否正确（可打印到消息框）
3. 在 SQL 客户端中手动验证查询

### Q2: Link 后数据库没有更新

**可能原因**:

- 数据库文件被其他程序锁定
- SQLite 权限不足
- drawing_file 记录 ID 获取错误

**排查方法**:

1. 检查 mp_log.txt 中的 SQL 执行日志
2. 确认数据库文件不被 Excel 或其他程序打开
3. 检查文件夹权限

### Q3: "Drawing not found" 错误

**解决方案**:

- 检查 drawing number 的大小写和空格
- 在 drawing_file 表中搜索类似的文件名
- 确认文件是否已上传到数据库

---

## 技术实现细节

### 全局状态管理 (mod_GlobalState.bas)

```vb
' 共享的全局变量
Public m_lastPartId As Variant  ' Fetch 查询到的 part_id
Dim m_lastResults() As DrawingFileResult  ' 上一次查询结果
Dim m_lastResultsCount As Long  ' 结果数量
```

**函数列表**:

- `SetLastResults()` - 保存 Fetch 结果
- `GetStoredResult()` - 获取单个结果
- `HasStoredResults()` - 检查是否有结果
- `GetAllStoredResults()` - 获取所有结果数组
- `GetStoredResultsCount()` - 获取结果数量

### 模块间调用流程

```
┌─────────────────────────────────────────────┐
│ mod_Integration                             │
│ ├─ FetchButton_Click()   ─────┐            │
│ └─ LinkButton_Click()    ─┐   │            │
└────────────────────────────┼┬──┼────────────┘
                             ││  │
         ┌───────────────┬────┘│  │
         │               │     │  │
         ▼               ▼     │  │
┌────────────────────────────────────────────┐
│ mod_FetchDrawingFiles (Fetch 流程主体)    │
│ └─ FetchDrawingFiles_Main()               │
│    ├─ QueryPartByDrawingNumber()          │
│    ├─ QueryDrawingFiles()                 │
│    ├─ ClearResults()                      │
│    ├─ DisplayQueryResults()               │
│    └─ SetLastResults()                    │
└────────────────────────────────────────────┘
                             │
         ┌───────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ mod_DrawingFileLink (Link 流程主体)       │
│ └─ LinkDrawingFile_Main()                 │
│    ├─ GetStoredResult()                   │
│    ├─ UpdateDrawingFileAsActive()         │
│    ├─ UpdateDrawingFileInactive()         │
│    ├─ UpdatePartIdToSelected()            │
│    └─ CopyConfirmationPicture()           │
└────────────────────────────────────────────┘
```

---

## 完成核对清单

- ✅ 模块设计完成（6 个新模块）
- ✅ 数据库查询逻辑实现
- ✅ UI 显示逻辑实现
- ✅ 数据更新逻辑实现
- ✅ 全局状态管理实现
- ✅ 按钮集成接口实现
- ⏳ **待确认**: Excel 按钮配置和测试

---

## 下一步测试计划

1. **模块编译检查**: 在 VBA 编辑器中检查是否有语法错误
2. **按钮配置**: 在 Excel 中添加 Fetch 和 Link 按钮
3. **功能测试**:
   - 正常查询测试（数据存在）
   - 无结果提示测试（数据不存在）
   - 多结果排序测试（验证优先级）
   - Link 数据库更新测试（验证 SQL 执行）
4. **边界情况测试**:
   - 空输入处理
   - 特殊字符处理
   - NULL 值处理
   - 数据库异常处理
