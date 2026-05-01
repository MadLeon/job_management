# 粗体格式处理 - 快速参考

## 功能说明

当在 data 表 D 列输入包含 `**text**` 的 process 文本时，在 display 中保留文本标记，只在最终插入时转换为 Excel 中的真正粗体格式。

## 工作流程

### 1️⃣ Display 显示阶段

- 显示内容：`_____ as per BOM c/w **Cert**` （保留 `**` 标记）
- 目的：用户可清楚看到哪些部分会被加粗
- 位置：U12:U39 区域

### 2️⃣ Information 信息输入阶段

- 用户在 X12 输入：`C-1018 HRS`
- \*\*标记保留不变

### 3️⃣ Merge 合并阶段

- 内部处理：`C-1018 HRS as per BOM c/w **Cert**`
- **标记仍保留**（MergePlaceholdersWithValues 不处理它们）
- 用户看不到这一步

### 4️⃣ Insert 最终插入阶段

- 调用 SetCellWithBoldFormat() 转换
- **Cert** 标记转换为真正的 Excel 粗体格式
- 最终显示：`C-1018 HRS as per BOM c/w Cert` （Cert 为粗体）
- 位置：F11:F39

## 使用示例

### 输入

data 表 D16: `{1} as per BOM c/w **Cert**`

### 输出流程

```
Display 显示 (U12)
  ↓
  "_____ as per BOM c/w **Cert**"
  （**Cert** 仍为文本标记）

  用户输入 X12 = "C-1018 HRS"
  ↓

Final 插入 (F11)
  ↓
  "C-1018 HRS as per BOM c/w Cert"
  （**Cert** → Cert 为真正粗体）
```

## 技术实现

### 数据流

```
data D列 → LoadDataSheet → ProcessData → DisplayProcesses
                                           ↓
                                    U列 (保留**)
                                           ↓
                                    用户输入 X/Y/Z
                                           ↓
                                    MergePlaceholdersWithValues
                                    (保留**)
                                           ↓
                                    OnInsertButtonClick
                                    SetCellWithBoldFormat()
                                    (转换为粗体)
                                           ↓
                                    F列 (真正粗体)
```

### 关键函数

**mod_RichTextFormatter.bas**

- `SetCellWithBoldFormat(targetCell, textWithMarkers)`
  - 只在最终插入时调用
  - 解析 `**text**` 标记
  - 应用真正的粗体格式

**mod_DisplayProcesses.bas**

- DisplayProcesses() - 保留 \*\* 标记赋值

**mod_InsertProcess.bas**

- OnInsertButtonClick() - 使用 SetCellWithBoldFormat 最终转换

## 支持的语法

- `**text**` - 单个粗体段
- `**part1** text **part2**` - 多个粗体段
- `plain text` - 无格式（无 \*\* 标记）

## 为什么这个设计

1. **避免格式丢失** - Rich Text 只在最后一步应用，不会在 cell 赋值中丢失
2. **用户友好** - Display 中看到 `**Cert**` 标记，知道最终会被加粗
3. **数据流纯净** - 中间步骤都是纯文本，无格式转换复杂性
4. **鲁棒性强** - 不依赖 Rich Text 的持久化

## 注意事项

- Display 中显示的 `**Cert**` 是文本标记，不是粗体
- Final 中显示的 `Cert` 才是真正的粗体
- 标记必须成对出现 (`**` 开始和结束)
