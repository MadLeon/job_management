# Session 9: 实现 Combo 逻辑

## 原始任务描述

本session主要任务: 实现 combo 逻辑

- data 工作表从C16开始(包括C16)的C列, 表明了该行的 manufacturing process 与其他行的关联关系
- C列的值表明关联过程的行号
- 若C列有值, 则表明该过程存在与之关联的过程; 反之, 则没有关联的过程
- 现在, 修改 DisplayProcesses, 在显示完所有应该显示的过程后, 将关联的过程显示在最下方
- 格式为: 空一行, 然后在U列显示一行标题: Relative Process, 然后在下方显示上方所有过程的相关过程, 使用关联过程的行号进行定位
- 举例:
  - 有这样两个应该显示的过程 P Material 22 {1} as per BOM c/w Cert; P Material 22 {1} as per Exception c/w Cert
  - 22行内容为: RT Material Receive or Stock; Inspect; Identify; HT# {1}
  - 在显示完这两个过程后, 应该输出:
    {空一行}
    Relative Process (U列)
    [Insert按钮](T列) "Receive or Stock; Inspect; Identify; HT# **\_**"(U列) "**\_\_\_\_**"(X列)

---

## 任务总结

**一句话总结**：
在DisplayProcesses中实现关联过程(combo)显示 - 主过程下方显示一个"Relative Process"区域，按C列行号动态插入关联的过程内容

---

## 理解与推断

- **数据来源**：data工作表C16开始的C列，每个值是关联过程的行号
- **显示逻辑**：
  - 先显示选中的主过程(当前逻辑)
  - 空一行分隔
  - 显示"Relative Process"标题(U列)
  - 按顺序显示所有主过程对应的关联过程(从C列行号提取)
- **关联过程的内容**：
  - 来自data工作表指定行号的数据
  - 需要保持原有格式(按钮、下划线填空等)
  - 支持占位符替换功能
- **实现位置**：DisplayProcesses函数，需要在现有逻辑后扩展

---

### 核心逻辑流程

1. 用户在W9选择type → 触发OnW9Changed
2. 获取U9的code和W9的type
3. 调用GetProcessesForCodeAndType()获取主过程
4. DisplayProcesses()显示主过程：
   - 逐行显示主过程到U12开始
   - 同时收集所有link值（关联行号）
5. 显示"Relative Process"区域：
   - 空一行分隔
   - U列显示标题"Relative Process"
   - 按行号遍历关联过程
   - 从data工作表对应行读取过程文本
   - 同样应用占位符替换和下划线显示
6. 生成Insert按钮
   - 按总的displayCount（主过程+关联过程）数量创建

---

## 修改文件列表

**1. dat_public_data.bas** - 更新结构注释

- ProcessData.link 现在是 Long（行号），不是字符串

**2. mod_DataInitialization.bas** - 核心修改

- 添加 ExtractRowNumberFromLink() 函数（新）
  - 解析"=ROW(D22)"格式的公式
  - 返回行号（Long），0表示无关联
- 修改 LoadDataSheet() 函数
  - 调用ExtractRowNumberFromLink()处理link字段

**3. mod_DisplayProcesses.bas** - 主逻辑修改

- 修改 DisplayProcesses() 函数
  - 添加 relatedRows Collection 收集所有关联行号
  - 在主过程循环中检查和收集link值
  - 添加"Relative Process"显示逻辑（空行 → 标题 → 关联过程）
  - 关联过程支持所有主过程的功能（占位符、X/Y/Z列填空等）
- 添加 GetProcessFromDataRow() 函数（新）
  - 从data工作表指定行读取过程文本
- 更新 GetProcessesForCodeAndType() JSDoc 注释

**4. mod_InsertProcess.bas** - 防护修改

- 修改 OnInsertButtonClick() 函数
  - 添加"Relative Process"标题行检查
  - 标题行不允许Insert操作，弹出提示信息

---

## 完整改动流程

```
用户选择W9(type)
    ↓
OnW9Changed() 触发
    ↓
GetProcessesForCodeAndType() 返回主过程
    ↓
DisplayProcesses() 开始执行：
    ├─ 显示主过程(U12~U15)
    │   ├─ 收集所有link值(行号)
    │   ├─ 应用占位符替换
    │   └─ 填充X/Y/Z列下划线
    │
    ├─ 空行分隔(U16) [跳过]
    │
    ├─ 显示"Relative Process"标题(U16)
    │   └─ 不增加displayCount
    │
    └─ 循环显示关联过程(U17~U19)
        ├─ GetProcessFromDataRow() 获取data行的过程文本
        ├─ 应用占位符替换
        ├─ 填充X/Y/Z列下划线
        └─ displayCount++ 为每个关联过程+1

    → CreateDynamicButtons(displayCount) 创建按钮
      (按钮会为标题行创建，但OnInsertButtonClick会跳过)
```

---

## 关键设计决策

1. **Link字段格式变更**
   - 从字符串"Combo 50"改为Long型行号50
   - 使用公式"=ROW(D22)"在Excel中维护

2. **"Relative Process"标题行**
   - 不计入displayCount（避免影响计算）
   - OnInsertButtonClick检查并提示用户

3. **重复行号去除**
   - 收集关联行时检查并去除重复
   - 一行数据只在结果中显示一次
