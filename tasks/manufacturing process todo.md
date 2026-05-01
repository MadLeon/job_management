# Manufacturing Process

- 为材料类别添加下拉列表, 可以实现材料的选择
- 边界情况, 如果mp超过一页, 应该允许行号从某一个值开始
- 添加插入行, 移除行按钮
- 添加保存功能
- 添加条码生成功能

🧠 🧭 2026 AI 开发标准路线（精简版）

可以理解为 5 层能力栈：

🥇 第一层：LLM基础 + Prompt工程（必须）
🎯 目标

你要搞清楚：

LLM 怎么“被控制”
prompt 怎么变成“可执行指令”
context 如何影响行为
📘 主流资料（选1-2即可）
《Prompt Engineering for Developers》（OpenAI系资料）
DeepLearning.AI: ChatGPT Prompt Engineering
Anthropic Prompt Engineering Guide（强烈推荐）
🧠 你在做的对应关系

你现在的：

business logic.txt
SKILL.md
prompt.md

👉 本质就是这一层的工程化版本

⚙️ 第二层：Agent系统（2026核心）
🎯 目标

从“问答模型”升级到：

AI = 可以执行任务的系统

📘 主流资料
🔥 必看（行业标准）
《Building LLM Agents》类资料（OpenAI / Anthropic blog）
ReAct: Reason + Act 论文
Tool Use / Function Calling 文档
🔥 框架（不用全学，但要理解）
LangGraph（最重要 ⭐）
AutoGen（多 agent）
CrewAI（role-based agent）
🧠 你现在的位置

你现在的 skill workflow =

👉 “手写版 Agent system”

下一步就是：

👉 结构化 agent（state machine）

🧱 第三层：Skill / Workflow工程化（你当前最关键）
🎯 目标

让 AI：

可复用
可分步骤执行
可暂停 / resume
可拆任务
📘 主流理念（不是书，是工程标准）

你需要理解这些：

workflow decomposition
role-based agent
instruction hierarchy
tool orchestration
🧠 你现在已经在做：
SKILL.md = interface
prompt.md = execution engine
reference/ = knowledge base

👉 这是2026标准结构雏形

🧠 第四层：Context Engineering（你现在最痛的点）
🎯 目标

解决：

AI 为什么会忘、乱、漂移

📘 主流内容
RAG（Retrieval Augmented Generation）
Memory Systems in LLM Agents
Context Window Management
Structured memory vs summary
⚠️ 关键趋势（2026重点）

行业已经从：

❌ prompt engineering
➡️ 转向：

👉 context engineering（上下文工程）

🧠 你现在的问题对应这里：

你现在的：

summary.md（弱记忆）
sessions/\*.md（线性记录）

👉 属于：

“非结构化 memory”

🧠 第五层：Agent OS（高级阶段）
🎯 目标

让 AI 变成：

一个“开发操作系统”

📘 主流方向（2026趋势）
LangGraph state machine agents
persistent memory agents
multi-session workflows
tool-first agents
🧠 你现在其实已经接近：

你的 system 已经是：

mini agent OS prototype

🚀 一条“最精简学习路径”（重点）

如果你只想学最关键的👇

🥇 Step 1（基础）
Prompt Engineering（Anthropic / OpenAI）
🥈 Step 2（核心）
ReAct + Tool Calling
Agent workflow concepts
🥉 Step 3（实战）
LangGraph（强烈推荐）
AutoGen（了解即可）
🧠 Step 4（你当前最重要）
Context Engineering
Memory system design
⚙️ 和你 Copilot 环境的直接映射

在 Visual Studio Code + Copilot 里：

你做的 对应AI概念
SKILL.md agent interface
prompt.md workflow engine
reference/ RAG knowledge base
session system memory system
todos + pause execution control
🔥 最重要的一句话总结

👉 2026 AI开发不是“写prompt”，而是：

🧠 “设计 AI 的工作流 + 记忆结构 + 执行状态”

💡 如果你想下一步升级（我建议）

你现在已经在正确轨道上了。

下一步可以做一个很关键的升级：

👉 把你当前 skill system 变成：

🧠 “LangGraph风格 state machine skill architecture”

可以做到：

自动 session 状态机
memory 自动结构化
todo 自动执行控制
reference 自动加载

如果你愿意，我可以帮你做下一步：

🔥 把你现在这套 system 升级成“2026标准 agent architecture（结构图 + 文件结构 + prompt重构）”
