---
name: mp-session
description: Manage manufacturing process session workflow, including session file creation, task understanding, todos, and summaries
---

# Manufacturing Session Skill

## Purpose

This skill manages a structured workflow for each development session related to manufacturing process logic.

## When to use

Use this skill when:

- Starting a new session
- Managing session-based tasks
- Recording structured summaries and todos

## Input

- 本session主要任务: (string)

## Behavior

The agent should:

1. Generate a clear understanding of the session task

- 简短任务总结（一句话中文）
- 理解与推断（要点格式）

2. Output the understanding and pause for user confirmation

3. Plan TODO steps based on the understanding and output them, then pause for user confirmation

3.5 当用户确认TODO步骤后, 在执行前, 首先对manufacturing process/Manufacturing Process - dev.xlsm文件进行备份, 备份文件命名格式为: "Manufacturing Process - dev*backup*{timestamp}.xlsm"

4. For each TODO step:

- Execute the step
- Output the result
- Pause for user confirmation before proceeding to the next step
- 注意, 在此步骤结束以前, 不要进行任何下一步的操作, 包括但不限于: 代码修改, 文件创建, session文件创建等

5. 在本session结束后, 经过用户确认之后, 创建一个新的 session 文件在 `src/manufacturing process/sessions/`，文件格式为 `session{number}.md`

6. Generate:

- Session内容总结（要点格式）
- 操作及决策细节（要点格式）

7. Append the input and generated content to the session file, including:

- 原样复制输入给skill的信息
- Copy instructions and understanding:
  - 简短任务总结（一句话中文）
  - 理解与推断（要点格式）
- Copy 第6步中生成的Session内容总结（要点格式）
- Copy 第6步中生成的操作及决策细节（要点格式）

## References

- 工程所有相关代码可以在 src/manufacturing process/ 中找到
- 如需阅读 excel 文件, 可以使用 .github/skills/xlsx 这个技能
- 一句话中文的意思为: 该文本内容是中文，并且用一句话进行总结
- 要点格式的意思为: 使用中文并采用 markdown 的 bullet points 格式进行输出, 并且每个要点都应该尽量简短且为一句话

## Example

Input:

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
