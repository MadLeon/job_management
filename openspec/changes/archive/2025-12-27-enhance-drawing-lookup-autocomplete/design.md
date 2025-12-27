# 设计文档: 增强图纸检索与作业表单自动完成

**Change ID**: `enhance-drawing-lookup-autocomplete`  
**Version**: 1.0  
**Last Updated**: 2025-12-27

## 系统概述（System Overview）

本变更涉及三个层次的改进：

1. **数据层**：drawings 表增加时间戳能力
2. **API 层**：图纸检索逻辑智能化
3. **UI 层**：表单自动完成体验优化

```
┌─────────────────────────────────────────────────────────┐
│                   CreateJobModal (UI)                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │ JobForm: part_number input (onBlur)              │  │
│  └────────────────┬─────────────────────────────────┘  │
└───────────────────┼─────────────────────────────────────┘
                    │ API 调用
                    ▼
┌─────────────────────────────────────────────────────────┐
│         /api/jobs/drawing-file-location (API)           │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 1. 直接匹配 drawing_number                       │  │
│  │ 2. 模糊匹配 drawing_name + customer filter      │  │
│  │ 3. 模糊匹配 drawing_name (无 customer)          │  │
│  │ 4. ⭐ 新增: 按 updated_at DESC 排序             │  │
│  └────────────────┬─────────────────────────────────┘  │
└───────────────────┼─────────────────────────────────────┘
                    │ SQL 查询
                    ▼
┌─────────────────────────────────────────────────────────┐
│              drawings 表 (Database)                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │ • drawing_name: TEXT                             │  │
│  │ • drawing_number: TEXT                           │  │
│  │ • file_location: TEXT                            │  │
│  │ • ⭐ updated_at: TEXT DEFAULT CURRENT_TIMESTAMP │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 数据模型变更（Data Model Changes）

### drawings 表结构（修改前）

```sql
CREATE TABLE drawings (
  drawing_name TEXT,
  drawing_number TEXT,
  file_location TEXT
);
```

### drawings 表结构（修改后）

```sql
CREATE TABLE drawings (
  drawing_name TEXT,
  drawing_number TEXT,
  file_location TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### 字段说明

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| drawing_name | TEXT | - | 图纸名称（用于模糊匹配） |
| drawing_number | TEXT | - | 图纸号（精确匹配键） |
| file_location | TEXT | - | 文件系统路径 |
| updated_at | TEXT | CURRENT_TIMESTAMP | 图纸最后更新时间，ISO 8601 格式 |

### 数据迁移策略

1. **现有数据处理**：
   - 已有记录的 `updated_at` 为 NULL（不自动回填）
   - 新插入记录自动填充当前时间戳

2. **排序逻辑**：
   ```sql
   -- NULL 值排在最后
   ORDER BY updated_at IS NULL, updated_at DESC
   ```

3. **后续批量更新**（可选）：
   ```sql
   -- 基于文件系统修改时间更新（需单独脚本）
   UPDATE drawings 
   SET updated_at = '2025-12-27T10:00:00Z' 
   WHERE drawing_number = 'XXX';
   ```

## API 逻辑增强（API Logic Enhancement）

### 当前流程（Before）

```javascript
// 步骤 1: 直接匹配
const directMatch = db.prepare(
  'SELECT file_location FROM drawings WHERE drawing_number = ?'
).get(drawingNumber);

// 步骤 2: 模糊匹配 + 客户筛选
const fuzzyMatches = db.prepare(
  'SELECT file_location FROM drawings WHERE drawing_name LIKE ? ORDER BY drawing_name'
).all(`%${drawingNumber}%`);

// 遍历找到第一个匹配客户路径的结果
for (const match of fuzzyMatches) {
  if (match.file_location.includes(customerName)) {
    return match.file_location;
  }
}
```

**问题**：多个匹配时返回第一个，无法识别最新版本

### 优化后流程（After）

```javascript
// 步骤 1: 直接匹配（优先级最高）
const directMatch = db.prepare(`
  SELECT file_location, updated_at 
  FROM drawings 
  WHERE drawing_number = ?
  ORDER BY updated_at IS NULL, updated_at DESC
  LIMIT 1
`).get(drawingNumber);

// 步骤 2: 模糊匹配 + 客户筛选
const fuzzyMatches = db.prepare(`
  SELECT file_location, updated_at 
  FROM drawings 
  WHERE drawing_name LIKE ?
  ORDER BY updated_at IS NULL, updated_at DESC
`).all(`%${drawingNumber}%`);

// 遍历找到第一个匹配客户路径的结果（已按时间排序）
for (const match of fuzzyMatches) {
  if (match.file_location.includes(customerName)) {
    return match.file_location; // 返回最新的匹配结果
  }
}
```

**改进**：
1. 所有查询增加 `updated_at` 排序
2. NULL 值自动排在最后，不影响旧数据
3. 优先返回最新更新的图纸

## UI 交互设计（UI Interaction Design）

### 用户旅程（User Journey）

```
1. 用户打开 CreateJobModal
   ↓
2. 填写 job_number, customer_name 等字段
   ↓
3. 在 part_number 输入框输入值（如 "GM223-1314-9"）
   ↓
4. 点击其他字段或按 Tab（触发 onBlur）
   ↓
5. [系统] 调用 API 检索图纸位置
   [UI] 显示 CircularProgress 在 file_location 字段旁
   ↓
6. [系统] API 返回结果
   [UI] 隐藏 CircularProgress
   [UI] 自动填充 file_location 字段
   ↓
7. 用户可以：
   - 接受自动填充的值
   - 手动修改 file_location
   - 继续填写其他字段
```

### 状态管理（State Management）

```javascript
// JobFormInner 组件状态
const [formData, setFormData] = useState(initialData);
const [isLoadingFileLocation, setIsLoadingFileLocation] = useState(false);

// 失焦处理函数
const handlePartNumberBlur = async () => {
  if (!formData.part_number.trim()) return;
  
  setIsLoadingFileLocation(true);
  try {
    const params = new URLSearchParams({
      drawingNumber: formData.part_number,
      customerName: formData.customer_name || ''
    });
    
    const response = await fetch(`/api/jobs/drawing-file-location?${params}`);
    const data = await response.json();
    
    if (data.fileLocation) {
      setFormData(prev => ({
        ...prev,
        file_location: data.fileLocation
      }));
    }
  } catch (error) {
    console.error('Failed to fetch drawing location:', error);
  } finally {
    setIsLoadingFileLocation(false);
  }
};
```

### UI 组件修改

```jsx
{/* Part Number 字段 */}
<Grid size={{ xs: 12, sm: 6 }}>
  <TextField
    fullWidth
    label="Part Number"
    name="part_number"
    value={formData.part_number}
    onChange={handleChange}
    onBlur={handlePartNumberBlur}  {/* ⭐ 新增 */}
    size="small"
  />
</Grid>

{/* File Location 字段 */}
<Grid size={{ xs: 12 }}>
  <Stack direction="row" spacing={0} sx={{ alignItems: 'flex-end', gap: 0 }}>
    <TextField
      fullWidth
      label="File Location"
      name="file_location"
      value={formData.file_location}
      onChange={handleChange}
      size="small"
      sx={{ pr: 1 }}
      placeholder="Paste full path or use Browse button"
    />
    <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileSelect} />
    <IconButton onClick={handleBrowseClick}>
      <FolderOpenIcon />
    </IconButton>
    <IconButton onClick={handlePreviewClick}>
      <VisibilityIcon />
    </IconButton>
    {/* ⭐ 新增加载指示器 */}
    {isLoadingFileLocation && (
      <CircularProgress size={24} sx={{ ml: 1 }} />
    )}
  </Stack>
</Grid>
```

## 性能考量（Performance Considerations）

### 查询性能

**当前查询**：
- drawings 表无索引，全表扫描
- LIKE 模糊匹配性能较低

**建议优化**（后续工作）：
```sql
-- 在 drawing_number 上创建索引
CREATE INDEX idx_drawing_number ON drawings(drawing_number);

-- 在 updated_at 上创建索引
CREATE INDEX idx_updated_at ON drawings(updated_at DESC);
```

**预估影响**：
- 小型数据集（< 10,000 条）：可忽略
- 中型数据集（10,000 - 100,000 条）：建议添加索引
- 大型数据集（> 100,000 条）：必须添加索引

### 网络延迟

**优化措施**：
1. 仅在 onBlur 触发，避免频繁请求
2. 前端显示加载状态，改善用户感知
3. 允许用户手动修改结果，不强制等待

## 错误处理（Error Handling）

### API 错误场景

| 场景 | HTTP 状态码 | 响应 | 前端行为 |
|------|-------------|------|----------|
| 缺少 drawingNumber | 400 | `{ error: '...' }` | 静默失败，不填充 |
| 数据库查询失败 | 500 | `{ error: '...' }` | 控制台警告 |
| 未找到匹配图纸 | 200 | `{ fileLocation: null }` | 不填充，允许手动输入 |
| 网络超时 | - | - | 控制台警告，隐藏加载指示器 |

### UI 降级策略

1. **API 失败**：保持 file_location 为空，允许手动输入
2. **加载超时**：5 秒后隐藏 CircularProgress
3. **无结果**：不显示错误提示，避免干扰用户

## 测试策略（Testing Strategy）

### 单元测试

**数据库迁移**：
```javascript
// 测试迁移执行
test('should add updated_at column', () => {
  const db = getDB();
  const info = db.pragma('table_info(drawings)');
  const updatedAtColumn = info.find(c => c.name === 'updated_at');
  
  expect(updatedAtColumn).toBeDefined();
  expect(updatedAtColumn.type).toBe('TEXT');
  expect(updatedAtColumn.dflt_value).toContain('CURRENT_TIMESTAMP');
});
```

**API 逻辑**：
```javascript
// 测试排序逻辑
test('should return latest drawing when multiple matches', () => {
  // 插入测试数据
  db.prepare(`INSERT INTO drawings VALUES (?, ?, ?, ?)`).run(
    'Drawing-A', 'GM223', '/path/old', '2024-01-01T00:00:00Z'
  );
  db.prepare(`INSERT INTO drawings VALUES (?, ?, ?, ?)`).run(
    'Drawing-B', 'GM223', '/path/new', '2025-12-27T00:00:00Z'
  );
  
  // 调用 API
  const result = await fetch('/api/jobs/drawing-file-location?drawingNumber=GM223');
  const data = await result.json();
  
  expect(data.fileLocation).toBe('/path/new');
});
```

### 集成测试

**UI 自动完成流程**：
```javascript
test('should auto-fill file location on part number blur', async () => {
  render(<CreateJobModal open={true} />);
  
  const partNumberInput = screen.getByLabelText('Part Number');
  fireEvent.change(partNumberInput, { target: { value: 'GM223' } });
  fireEvent.blur(partNumberInput);
  
  // 等待加载指示器出现
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
  
  // 等待 API 返回
  await waitFor(() => {
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
  
  // 验证自动填充
  const fileLocationInput = screen.getByLabelText('File Location');
  expect(fileLocationInput.value).toBe('/expected/path');
});
```

### 手动测试场景

1. **场景 1: 正常流程**
   - 输入 part_number → 失焦 → 验证自动填充

2. **场景 2: 多个匹配结果**
   - 准备多条相同 drawing_number 但不同 updated_at 的记录
   - 验证返回最新的图纸

3. **场景 3: 无匹配结果**
   - 输入不存在的 part_number
   - 验证 file_location 保持为空

4. **场景 4: API 失败**
   - 模拟网络错误
   - 验证加载指示器消失，不阻塞用户操作

## 部署计划（Deployment Plan）

### 阶段 1: 数据库迁移（不停机）

```bash
# 1. 备份数据库
cp data/jobs.db data/jobs.db.backup

# 2. 执行迁移
npm run db:migrate

# 3. 验证迁移
node scripts/check-db.js

# 4. 如有问题，回滚
npm run db:migrate:down
```

### 阶段 2: API 部署（向后兼容）

- API 逻辑增强不影响现有调用方
- 旧数据（updated_at=NULL）保持原有行为

### 阶段 3: UI 部署（渐进式增强）

- 用户可继续手动输入 file_location
- 自动完成作为额外功能，不强制依赖

### 回滚策略

1. **数据库回滚**：执行 down 迁移，删除 updated_at 列
2. **API 回滚**：移除排序逻辑，恢复原有代码
3. **UI 回滚**：移除 onBlur 处理与加载状态

## 监控与指标（Monitoring & Metrics）

### 关键指标

1. **API 响应时间**：`/api/jobs/drawing-file-location` 的 P50/P95/P99
2. **自动完成成功率**：返回非 NULL file_location 的比例
3. **用户手动修改率**：自动填充后被用户修改的比例

### 日志记录

```javascript
// API 层
console.log('[drawing-file-location] Query:', { drawingNumber, customerName });
console.log('[drawing-file-location] Result:', { fileLocation, updated_at });

// UI 层
console.log('[JobForm] Auto-fill triggered for part:', partNumber);
console.log('[JobForm] Auto-fill result:', fileLocation);
```

## 未来扩展（Future Extensions）

1. **版本历史查看**：在 UI 显示所有匹配的图纸版本，允许用户选择
2. **智能推荐**：基于客户、作业类型等推荐最可能的图纸
3. **批量更新工具**：扫描文件系统，批量更新 updated_at
4. **图纸预览**：在自动完成后直接预览图纸内容
