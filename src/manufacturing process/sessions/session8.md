本session主要任务: 为 process 中的占位符添加具体内容
第一步: 在 display 区域添加显示下划线填空

- 当前的 process 中采用 {1}, {2} 此类格式的占位符表示该位置的文本需要在后续由用户指定
- 规划 X, Y, Z 列为三个信息收集区域, 从第12行(包括第12行)开始
- 在 session6 中我们实现了 display 区域随 W9 的改变会触发 process 的动态填入
- 修改这部分代码, 使得在填入每个 process 时, 若发现其中包含 {数字} 形式的占位符时, 在信息收集区域相应显示 "**\_\_\_\_**"
- X, Y, Z 分别表示 {1}, {2}, 和 {3}, 占位符有哪个, 就在哪列显示下划线
- 举例, "{1} as per BOM c/w Cert" 这条内容在填入 display 区域时
  1. 被修改为了 "**\_** as per BOM c/w Cert"
  2. 我需要该行 X 列的格子的值同时被改为 "**\_\_\_\_**"
- 另外的例子, 如果 "{1} {2} as per BOM c/w Cert" 是这样的 process
  - 则应该 X, Y 列都显示 "**\_\_\_\_**"
- 如果存在某条 process 包含 {1}, {2}, {3}, 则该行 X, Y, Z 都显示 "**\_\_\_\_**"
- 在清除区域内容时, X, Y, Z 列也应该被清除

第二步: 在点击插入按钮时, 将信息收集区域的数据与 U 列内容合并

- 目前, 在点击每行的 insert 按钮后, U 列的内容将被添加到表格中
- 如果该 process 中包含 "**\_**" 也会被原样填入
- 现在我希望用户在信息收集区域填入的实际值会代替下划线被填入
- 如果用户没有更新信息收集区域的内容, 则还是按照当前逻辑填入下划线
- 举例, "{1} as per BOM c/w Cert" 这条内容在填入 display 区域时
  1. 被修改为了 "**\_** as per BOM c/w Cert", 该行 X 列的格子的值同时被改为 "**\_\_\_\_**"
  2. 用户修改了 X 列的值为 "C-1018 HRS"
  3. 在点击 insert 后, 实际插入的值应该为 "C-1018 HRS as per BOM c/w Cert"

## 任务理解总结

**本 session 主要任务**: 实现 process 中的占位符 {1}, {2}, {3} 自动填空功能与合并逻辑

**理解与推断**:

- 第一步：检测 process 中的 {数字} 占位符，在对应的 X/Y/Z 列显示 "**\_\_\_\_**" 下划线，同时在 display 区域将占位符显示为 "**\_**"
- 第二步：在点击 insert 按钮时，用用户在 X/Y/Z 列填入的实际值替换 U 列中的下划线
- 核心逻辑修改点：mod_DisplayProcesses.bas（填入 process 时的处理）和 mod_InsertProcess.bas（插入时的合并逻辑）

---

## 本 Session 总结

### 本 Session Todos

- ✅ 阅读背景文档了解架构
- ✅ 查看相关代码模块
- ✅ 实现第一步：占位符检测与显示
- ✅ 实现第二步：占位符合并与替换
- ✅ 代码验证和调试
- ✅ 完成总结文档

### 操作及变更细节

**mod_DisplayProcesses.bas 修改**:

- 添加常量：X_COLUMN, Y_COLUMN, Z_COLUMN, PLACEHOLDER_MARKER（"**\_\_\_\_**"）
- 修改 `DisplayProcesses()` 函数：
  - 在填充 U 列前调用 `DetectPlaceholders()` 检测占位符数字
  - 根据检测结果在相应的 X/Y/Z 行填充下划线标记 "**\_\_\_\_**"
  - {1} 对应 X 列，{2} 对应 Y 列，{3} 对应 Z 列
- 修改 `ClearDisplayArea()` 函数：
  - 新增清空 X/Y/Z 列范围（X12:X39, Y12:Y39, Z12:Z39）的逻辑
- 添加 `DetectPlaceholders()` 函数（新）：
  - 扫描 process 文本中的 {数字} 占位符
  - 返回 Collection 包含所有找到的占位符数字
  - 去除重复数字

**mod_InsertProcess.bas 修改**:

- 添加常量：X_COLUMN, Y_COLUMN, Z_COLUMN, PLACEHOLDER_MARKER
- 修改 `OnInsertButtonClick()` 函数：
  - 获取 U 列显示内容（已替换占位符的 "**\_**" 格式）
  - 获取 X/Y/Z 列用户填入的值
  - 调用 `MergePlaceholdersWithValues()` 合并占位符与用户值
  - 将最终结果填充到 F 列（代替原来的直接填充）
- 添加 `MergePlaceholdersWithValues()` 函数（新）：
  - 逐字符扫描 displayText 寻找 "**\_**" 占位符序列
  - 按顺序检查 placeholderValues(1), (2), (3) 是否有用户填入的值
  - 若有有效值（非空、非"**\_\_\_\_**"），则替换相应的 "**\_**"
  - 若无有效值，保持 "**\_**" 原样
  - 返回最终的 process 文本
- 修复变量声明：添加缺失的 `j As Long` 变量

### 关键设计决策

| 项目           | 决策                                        | 原因                                |
| -------------- | ------------------------------------------- | ----------------------------------- |
| 占位符检测时机 | 在 DisplayProcesses 中同时进行              | 避免重复扫描 process 文本           |
| X/Y/Z 列用途   | 信息收集区域，显示 "**\_\_\_\_**"           | 清晰标记需要用户填写的位置          |
| 合并策略       | 按 "**\_**" 顺序依次替换                    | 简化逻辑，避免需要原始 process 文本 |
| 默认行为       | 用户未填或填 "**\_\_\_\_**" 时保持 "**\_**" | 保留占位符供后续处理                |

### 流程设计

```
用户从下拉列表选择 Code 和 Type
     ↓
OnW9Changed() 触发
     ↓
DisplayProcesses() 获取对应的 process 列表
     ├─ 对每个 process：
     │  ├─ 检测占位符数字 → DetectPlaceholders()
     │  ├─ 显示处理后文本到 U 列（{1} → "_____"）
     │  └─ 显示占位符标记到 X/Y/Z 列（"________"）
     ├─ 创建 Insert 按钮
     └─ 清空时同步清空 X/Y/Z
          ↓
用户点击 Insert 按钮 / 填写 X/Y/Z 列
          ↓
OnInsertButtonClick(row) 触发
          ├─ 获取 U 列显示内容
          ├─ 获取 X/Y/Z 列用户值
          ├─ MergePlaceholdersWithValues() 合并
          │  └─ 按 "_____" 顺序替换为有效的 X/Y/Z 值
          └─ 填充到 F 列最终表
```

### 未来注意

- 若 process 包含 {1}, {2}, {3} 以外的占位符（{4}、{5} 等），当前只显示 X/Y/Z 三列，需扩展
- 若需支持动态占位符数量，应考虑从 W 列开始动态创建列
- MergePlaceholdersWithValues 当前假设每个占位符对应一个 "**\_**"，若有多个 {1} 的情况需特殊处理
- 建议在 X/Y/Z 列添加验证或提示，指示用户需要填写

## Todos

- [x] **Todo 1**: 阅读 structure.txt、summary.md、session7.md 了解当前架构与前置工作
- [x] **Todo 2**: 查看 mod_DisplayProcesses.bas 中的占位符替换逻辑 和 mod_ButtonManager 结构
- [x] **Todo 3**: 实现第一步：占位符检测与下划线显示逻辑（修改 DisplayProcesses）
- [x] **Todo 4**: 实现第二步：插入时的占位符合并逻辑（修改 InsertProcess）
- [x] **Todo 5**: 代码逻辑验证（检查变量声明、函数调用、边界情况）
- [x] **Todo 6**: 完成 session 总结
