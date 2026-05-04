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

## References

- 工程所有相关代码可以在 src/manufacturing process/ 中找到
- 如需阅读 excel 文件, 可以使用 .github/skills/xlsx 这个技能
- "一句话中文" 意思为: 该文本内容是中文，并且用一句话进行总结
- "要点格式" 意思为: 使用中文并采用 markdown 的 bullet points 格式进行输出, 并且每个要点都应该尽量简短且为一句话
- vba代码中不能使用中文, 只能使用英文

# Context (必须读取)

你必须在开始前阅读以下内容：

- 阅读 src/manufacturing process/structure.txt 了解 Manufacturing Process.xlsm 结构
- 阅读 src/manufacturing process/sessions/\*.md 作为历史记忆
- 阅读 src/manufacturing process/lib_logger.bas 和 src/manufacturing process/LOGGER_GUIDE.txt 学习日志功能
- 阅读 src/manufacturing process/dat_public_data.bas 了解全局变量

## Behavior

The agent should:

1. Generate a clear understanding of the session task, using the following format:

- 简短任务总结（一句话中文）
- 理解与推断（要点格式）

2. Output the understanding (from step 1) and pause for user confirmation

3. Plan TODO steps based on the understanding, output the TODO steps, then pause for user confirmation

3.5 当用户确认TODO步骤后, 在执行前, 首先对manufacturing process/Manufacturing Process - dev.xlsm文件进行备份, 备份文件命名格式为: "Manufacturing Process - dev backup {timestamp}.xlsm"

4. 在开始步骤后, for each TODO step:

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

## Example

Input:

本session主要任务: 优化行号的显示逻辑

- 目前行号的计算方式是从0开始, 每一行递增10
- 具体代码参见 sheet1.bas: update_row_number()
- 这无法适应多页的情况, 因为从第二页开始, 应该继续第一页的最后一个数字, 而不能从10再来一次
- 修改逻辑, 现在, 起始的数字从输出区域的第一行的E列的值开始, 如果不存在该值, 则从10开始
- 举例第一行的数字为90, 则下一行的行号应该是100, 以此类推

Output:

src/manufacturing process/sessions/session13.md
