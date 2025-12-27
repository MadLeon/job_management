<!-- 说明：本文件为中文版本，并保留关键英文名词（术语/标题/命令/路径），以确保 OpenSpec 工具与解析器兼容。 -->

# OpenSpec 指南（OpenSpec Instructions）

使用 OpenSpec 进行规格驱动开发（spec-driven development）的 AI 编码助手（AI coding assistants）指南。

## 快速清单（TL;DR Quick Checklist）

- 检索现有工作：`openspec spec list --long`、`openspec list`（仅在需要全文检索时使用 `rg`）
- 明确范围：新增能力 vs 修改现有能力
- 选择唯一的 `change-id`：kebab-case，动词开头（如 `add-`、`update-`、`remove-`、`refactor-`）
- 脚手架：`proposal.md`、`tasks.md`、`design.md`（按需），以及受影响能力的增量规范（delta specs）
- 编写增量：使用 `## ADDED|MODIFIED|REMOVED|RENAMED Requirements`；每个需求至少包含一个 `#### Scenario:`
- 校验：`openspec validate [change-id] --strict` 并修复问题
- 请求批准：提案（proposal）未获批准前不要开始实现

## 三阶段工作流（Three-Stage Workflow）

### 阶段一：创建变更（Creating Changes）
在以下情形需要创建提案（proposal）：
- 添加功能或能力（features/capabilities）
- 引入重大变更（breaking changes，如 API、schema）
- 调整架构或模式（architecture/patterns）
- 优化性能（会改变行为）
- 更新安全模式（security patterns）

触发示例（Triggers）：
- “Help me create a change proposal”
- “Help me plan a change”
- “Help me create a proposal”
- “I want to create a spec proposal”
- “I want to create a spec”

宽松匹配指引（Loose matching guidance）：
- 包含其一：`proposal`、`change`、`spec`
- 搭配其一：`create`、`plan`、`make`、`start`、`help`

无需创建提案的情况（Skip proposal）：
- Bug 修复（恢复既定行为）
- 拼写/格式/注释修改
- 依赖更新（非破坏性）
- 配置变更
- 针对既有行为的测试

工作流（Workflow）：
1. 阅读 `openspec/project.md`、运行 `openspec list` 与 `openspec list --specs` 以理解当前上下文。
2. 选择唯一、动词开头的 `change-id`；创建 `proposal.md`、`tasks.md`、可选的 `design.md`，并在 `openspec/changes/<id>/` 下为受影响能力编写规范增量（deltas）。
3. 用 `## ADDED|MODIFIED|REMOVED Requirements` 与至少一个 `#### Scenario:` 起草增量。
4. 运行 `openspec validate <id> --strict` 并在分享提案前解决所有问题。

### 阶段二：实施变更（Implementing Changes）
将以下步骤记录为 TODO，并逐项完成：
1. 读取 `proposal.md` —— 理解要构建的内容
2. 读取 `design.md`（若存在）—— 审阅技术决策
3. 读取 `tasks.md` —— 获取实现检查清单
4. 按顺序实现任务 —— 逐项完成
5. 完成确认 —— 确保 `tasks.md` 的每一项都已完成
6. 更新清单 —— 全部完成后将任务标记为 `- [x]`
7. 审批门禁 —— 提案未批准前不要开始实现

### 阶段三：归档变更（Archiving Changes）
部署后创建单独的 PR：
- 将 `changes/[name]/` → `changes/archive/YYYY-MM-DD-[name]/`
- 若能力（capabilities）发生变化，更新 `specs/`
- 对仅工具类变更使用 `openspec archive <change-id> --skip-specs --yes`（始终传递变更 ID）
- 运行 `openspec validate --strict` 确认归档后的变更通过检查

## 在开始任何任务之前（Before Any Task）

上下文检查清单（Context Checklist）：
- [ ] 阅读相关能力规范 `specs/[capability]/spec.md`
- [ ] 检查 `changes/` 中的待定变更是否冲突
- [ ] 阅读 `openspec/project.md` 了解约定
- [ ] 运行 `openspec list` 查看活跃变更
- [ ] 运行 `openspec list --specs` 查看已有能力

创建规范之前（Before Creating Specs）：
- 始终检查该能力是否已存在
- 优先修改现有规范，避免重复创建
- 使用 `openspec show [spec]` 查看当前状态
- 如果请求不清晰，在脚手架之前先提出 1–2 个澄清问题

### 搜索指引（Search Guidance）
- 枚举规范：`openspec spec list --long`（或用于脚本的 `--json`）
- 枚举变更：`openspec list`（或 `openspec change list --json`，已弃用但可用）
- 显示详情：
  - 规范：`openspec show <spec-id> --type spec`（过滤时用 `--json`）
  - 变更：`openspec show <change-id> --json --deltas-only`
- 全文检索（ripgrep）：`rg -n "Requirement:|Scenario:" openspec/specs`

## 快速上手（Quick Start）

### CLI 命令（CLI Commands）

```bash
# Essential commands
openspec list                  # List active changes
openspec list --specs          # List specifications
openspec show [item]           # Display change or spec
openspec validate [item]       # Validate changes or specs
openspec archive <change-id> [--yes|-y]   # Archive after deployment (add --yes for non-interactive runs)

# Project management
openspec init [path]           # Initialize OpenSpec
openspec update [path]         # Update instruction files

# Interactive mode
openspec show                  # Prompts for selection
openspec validate              # Bulk validation mode

# Debugging
openspec show [change] --json --deltas-only
openspec validate [change] --strict
```

### 命令标志（Command Flags）

- `--json` —— 机器可读输出（machine-readable output）
- `--type change|spec` —— 区分项目类型（disambiguate items）
- `--strict` —— 全面校验（comprehensive validation）
- `--no-interactive` —— 禁用交互（disable prompts）
- `--skip-specs` —— 归档时不更新规范（archive without spec updates）
- `--yes`/`-y` —— 跳过确认（non-interactive archive）

## 目录结构（Directory Structure）

```
openspec/
├── project.md              # 项目约定（Project conventions）
├── specs/                  # 真实状态：已构建的能力（what IS built）
│   └── [capability]/       # 单一聚焦能力（Single focused capability）
│       ├── spec.md         # 需求与场景（Requirements and scenarios）
│       └── design.md       # 技术模式（Technical patterns）
├── changes/                # 提案：预期改变（what SHOULD change）
│   ├── [change-name]/
│   │   ├── proposal.md     # 原因、内容、影响（Why, what, impact）
│   │   ├── tasks.md        # 实施检查清单（Implementation checklist）
│   │   ├── design.md       # 技术决策（可选；optional）
│   │   └── specs/          # 规范增量（Delta changes）
│   │       └── [capability]/
│   │           └── spec.md # ADDED/MODIFIED/REMOVED
│   └── archive/            # 已完成的变更（Completed changes）
```

## 创建变更提案（Creating Change Proposals）

### 决策树（Decision Tree）

```
New request?
├─ Bug fix restoring spec behavior? → Fix directly
├─ Typo/format/comment? → Fix directly  
├─ New feature/capability? → Create proposal
├─ Breaking change? → Create proposal
├─ Architecture change? → Create proposal
└─ Unclear? → Create proposal (safer)
```

### 提案结构（Proposal Structure）

1. 创建目录：`changes/[change-id]/`（kebab-case，动词开头，唯一）

2. 编写 `proposal.md`：
```markdown
# Change: [Brief description of change]

## Why
[1-2 sentences on problem/opportunity]

## What Changes
- [Bullet list of changes]
- [Mark breaking changes with **BREAKING**]

## Impact
- Affected specs: [list capabilities]
- Affected code: [key files/systems]
```

3. 创建规范增量：`specs/[capability]/spec.md`
```markdown
## ADDED Requirements
### Requirement: New Feature
The system SHALL provide...

#### Scenario: Success case
- **WHEN** user performs action
- **THEN** expected result

## MODIFIED Requirements
### Requirement: Existing Feature
[Complete modified requirement]

## REMOVED Requirements
### Requirement: Old Feature
**Reason**: [Why removing]
**Migration**: [How to handle]
```
若影响多个能力（capabilities），请在 `changes/[change-id]/specs/<capability>/spec.md` 下为每个能力分别创建增量文件。

4. 创建 `tasks.md`：
```markdown
## 1. Implementation
- [ ] 1.1 Create database schema
- [ ] 1.2 Implement API endpoint
- [ ] 1.3 Add frontend component
- [ ] 1.4 Write tests
```

5. 何时需要 `design.md`：
当满足以下任一条件时创建 `design.md`，否则省略：
- 跨领域变更（涉及多个服务/模块）或引入新的架构模式
- 新的外部依赖或显著的数据模型变更
- 涉及安全、性能或复杂迁移
- 存在歧义且在编码前需要技术决策

最小 `design.md` 模板：
```markdown
## Context
[Background, constraints, stakeholders]

## Goals / Non-Goals
- Goals: [...]
- Non-Goals: [...]

## Decisions
- Decision: [What and why]
- Alternatives considered: [Options + rationale]

## Risks / Trade-offs
- [Risk] → Mitigation

## Migration Plan
[Steps, rollback]

## Open Questions
- [...]
```

## 规范文件格式（Spec File Format）

### 严格要求：Scenario 格式（Critical: Scenario Formatting）

正确示例（使用 `####` 标题）：
```markdown
#### Scenario: User login success
- **WHEN** valid credentials provided
- **THEN** return JWT token
```

错误示例（不要使用项目符号或粗体作为标题）：
```markdown
- **Scenario: User login**  ❌
**Scenario**: User login     ❌
### Scenario: User login      ❌
```

每个需求（Requirement）必须至少包含一个 Scenario。

### 需求措辞（Requirement Wording）
- 使用 SHALL/MUST 进行规范性要求（避免使用 should/may，除非有意非规范性）

### 增量操作（Delta Operations）

- `## ADDED Requirements` —— 新增能力
- `## MODIFIED Requirements` —— 行为变化
- `## REMOVED Requirements` —— 功能废弃
- `## RENAMED Requirements` —— 仅名称改变

标题匹配使用 `trim(header)` —— 忽略空白差异。

#### 何时使用 ADDED vs MODIFIED
- ADDED：引入新的、可独立存在的能力或子能力。更倾向于当变更是正交新增（如增加 “Slash Command Configuration”），而非改变既有需求的语义。
- MODIFIED：修改既有需求的行为、范围或验收准则。务必粘贴完整更新后的需求（标题 + 所有场景）；归档器会用你提供的内容替换原需求，增量缺失将导致旧细节丢失。
- RENAMED：仅名称改变时使用。若同时改变行为，需使用 RENAMED（名称）+ MODIFIED（内容），并引用新名称。

常见误区：使用 MODIFIED 新增关注点但未包含之前文本，导致归档时丢失细节。若你并未明确改变现有需求，请在 ADDED 下新增一个新需求。

正确撰写 MODIFIED 的步骤：
1）定位现有需求：`openspec/specs/<capability>/spec.md`
2）复制完整需求块（从 `### Requirement: ...` 到其场景）
3）粘贴到 `## MODIFIED Requirements` 并编辑为新行为
4）确保标题文本完全匹配（忽略空白），且至少保留一个 `#### Scenario:`

RENAMED 示例：
```markdown
## RENAMED Requirements
- FROM: `### Requirement: Login`
- TO: `### Requirement: User Authentication`
```

## 故障排除（Troubleshooting）

### 常见错误（Common Errors）

“Change must have at least one delta”
- 检查 `changes/[name]/specs/` 是否存在 .md 文件
- 验证文件包含操作前缀（`## ADDED Requirements` 等）

“Requirement must have at least one scenario”
- 检查场景使用 `#### Scenario:`（四个井号）
- 不要用项目符号或粗体代替场景标题

静默场景解析失败（Silent scenario parsing failures）
- 格式要求：`#### Scenario: Name`
- 使用 `openspec show [change] --json --deltas-only` 进行调试

### 校验技巧（Validation Tips）

```bash
# Always use strict mode for comprehensive checks
openspec validate [change] --strict

# Debug delta parsing
openspec show [change] --json | jq '.deltas'

# Check specific requirement
openspec show [spec] --json -r 1
```

## 理想路径脚本（Happy Path Script）

```bash
# 1) Explore current state
openspec spec list --long
openspec list
# Optional full-text search:
# rg -n "Requirement:|Scenario:" openspec/specs
# rg -n "^#|Requirement:" openspec/changes

# 2) Choose change id and scaffold
CHANGE=add-two-factor-auth
mkdir -p openspec/changes/$CHANGE/{specs/auth}
printf "## Why\n...\n\n## What Changes\n- ...\n\n## Impact\n- ...\n" > openspec/changes/$CHANGE/proposal.md
printf "## 1. Implementation\n- [ ] 1.1 ...\n" > openspec/changes/$CHANGE/tasks.md

# 3) Add deltas (example)
cat > openspec/changes/$CHANGE/specs/auth/spec.md << 'EOF'
## ADDED Requirements
### Requirement: Two-Factor Authentication
Users MUST provide a second factor during login.

#### Scenario: OTP required
- **WHEN** valid credentials are provided
- **THEN** an OTP challenge is required
EOF

# 4) Validate
openspec validate $CHANGE --strict
```

## 多能力示例（Multi-Capability Example）

```
openspec/changes/add-2fa-notify/
├── proposal.md
├── tasks.md
└── specs/
    ├── auth/
    │   └── spec.md   # ADDED: Two-Factor Authentication
    └── notifications/
        └── spec.md   # ADDED: OTP email notification
```

auth/spec.md
```markdown
## ADDED Requirements
### Requirement: Two-Factor Authentication
...
```

notifications/spec.md
```markdown
## ADDED Requirements
### Requirement: OTP Email Notification
...
```

## 最佳实践（Best Practices）

### 简单优先（Simplicity First）
- 默认新增代码 <100 行
- 单文件实现，除非确有不足
- 避免引入框架，除非有明确理由
- 选择成熟、可预期的模式（boring, proven patterns）

### 复杂性触发（Complexity Triggers）
仅在以下情况下引入复杂性：
- 以性能数据证明当前方案过慢
- 具备明确规模要求（>1000 users, >100MB data）
- 多个已证实用例需要抽象

### 清晰引用（Clear References）
- 使用 `file.ts:42` 形式标注代码位置
- 引用规范为 `specs/auth/spec.md`
- 链接相关变更与 PR

### 能力命名（Capability Naming）
- 使用动词-名词：`user-auth`、`payment-capture`
- 每个能力保持单一目的（single purpose）
- 10 分钟可理解原则
- 若描述需要 “AND” 则拆分

### 变更 ID 命名（Change ID Naming）
- 使用 kebab-case，简短且描述性：`add-two-factor-auth`
- 偏好动词前缀：`add-`、`update-`、`remove-`、`refactor-`
- 保证唯一性；若冲突，追加 `-2`、`-3` 等

## 工具选择指南（Tool Selection Guide）

| 任务（Task） | 工具（Tool） | 原因（Why） |
|------|------|-----|
| 按模式查找文件 | Glob | Fast pattern matching |
| 搜索代码内容 | Grep | Optimized regex search |
| 读取特定文件 | Read | Direct file access |
| 探索未知范围 | Task | Multi-step investigation |

## 错误恢复（Error Recovery）

### 变更冲突（Change Conflicts）
1. 运行 `openspec list` 查看活跃变更
2. 检查是否存在重叠规范
3. 与变更所有者协调
4. 考虑合并提案

### 校验失败（Validation Failures）
1. 使用 `--strict` 标志运行
2. 检查 JSON 输出细节
3. 验证规范文件格式
4. 确保场景格式正确

### 缺失上下文（Missing Context）
1. 优先阅读 `project.md`
2. 检查相关规范
3. 查看近期归档
4. 请求澄清

## 快速参考（Quick Reference）

### 阶段指示（Stage Indicators）
- `changes/` —— 提议，尚未构建
- `specs/` —— 已构建并部署
- `archive/` —— 已完成的变更

### 文件用途（File Purposes）
- `proposal.md` —— 原因与内容（Why and what）
- `tasks.md` —— 实施步骤（Implementation steps）
- `design.md` —— 技术决策（Technical decisions）
- `spec.md` —— 需求与行为（Requirements and behavior）

### CLI 基础（CLI Essentials）
```bash
openspec list              # What's in progress?
openspec show [item]       # View details
openspec validate --strict # Is it correct?
openspec archive <change-id> [--yes|-y]  # Mark complete (add --yes for automation)
```

请记住：规范（Specs）代表真实；变更（Changes）是提案。保持二者同步。
# OpenSpec Instructions

Instructions for AI coding assistants using OpenSpec for spec-driven development.

## TL;DR Quick Checklist

- Search existing work: `openspec spec list --long`, `openspec list` (use `rg` only for full-text search)
- Decide scope: new capability vs modify existing capability
- Pick a unique `change-id`: kebab-case, verb-led (`add-`, `update-`, `remove-`, `refactor-`)
- Scaffold: `proposal.md`, `tasks.md`, `design.md` (only if needed), and delta specs per affected capability
- Write deltas: use `## ADDED|MODIFIED|REMOVED|RENAMED Requirements`; include at least one `#### Scenario:` per requirement
- Validate: `openspec validate [change-id] --strict` and fix issues
- Request approval: Do not start implementation until proposal is approved

## Three-Stage Workflow

### Stage 1: Creating Changes
Create proposal when you need to:
- Add features or functionality
- Make breaking changes (API, schema)
- Change architecture or patterns  
- Optimize performance (changes behavior)
- Update security patterns

Triggers (examples):
- "Help me create a change proposal"
- "Help me plan a change"
- "Help me create a proposal"
- "I want to create a spec proposal"
- "I want to create a spec"

Loose matching guidance:
- Contains one of: `proposal`, `change`, `spec`
- With one of: `create`, `plan`, `make`, `start`, `help`

Skip proposal for:
- Bug fixes (restore intended behavior)
- Typos, formatting, comments
- Dependency updates (non-breaking)
- Configuration changes
- Tests for existing behavior

**Workflow**
1. Review `openspec/project.md`, `openspec list`, and `openspec list --specs` to understand current context.
2. Choose a unique verb-led `change-id` and scaffold `proposal.md`, `tasks.md`, optional `design.md`, and spec deltas under `openspec/changes/<id>/`.
3. Draft spec deltas using `## ADDED|MODIFIED|REMOVED Requirements` with at least one `#### Scenario:` per requirement.
4. Run `openspec validate <id> --strict` and resolve any issues before sharing the proposal.

### Stage 2: Implementing Changes
Track these steps as TODOs and complete them one by one.
1. **Read proposal.md** - Understand what's being built
2. **Read design.md** (if exists) - Review technical decisions
3. **Read tasks.md** - Get implementation checklist
4. **Implement tasks sequentially** - Complete in order
5. **Confirm completion** - Ensure every item in `tasks.md` is finished before updating statuses
6. **Update checklist** - After all work is done, set every task to `- [x]` so the list reflects reality
7. **Approval gate** - Do not start implementation until the proposal is reviewed and approved

### Stage 3: Archiving Changes
After deployment, create separate PR to:
- Move `changes/[name]/` → `changes/archive/YYYY-MM-DD-[name]/`
- Update `specs/` if capabilities changed
- Use `openspec archive <change-id> --skip-specs --yes` for tooling-only changes (always pass the change ID explicitly)
- Run `openspec validate --strict` to confirm the archived change passes checks

## Before Any Task

**Context Checklist:**
- [ ] Read relevant specs in `specs/[capability]/spec.md`
- [ ] Check pending changes in `changes/` for conflicts
- [ ] Read `openspec/project.md` for conventions
- [ ] Run `openspec list` to see active changes
- [ ] Run `openspec list --specs` to see existing capabilities

**Before Creating Specs:**
- Always check if capability already exists
- Prefer modifying existing specs over creating duplicates
- Use `openspec show [spec]` to review current state
- If request is ambiguous, ask 1–2 clarifying questions before scaffolding

### Search Guidance
- Enumerate specs: `openspec spec list --long` (or `--json` for scripts)
- Enumerate changes: `openspec list` (or `openspec change list --json` - deprecated but available)
- Show details:
  - Spec: `openspec show <spec-id> --type spec` (use `--json` for filters)
  - Change: `openspec show <change-id> --json --deltas-only`
- Full-text search (use ripgrep): `rg -n "Requirement:|Scenario:" openspec/specs`

## Quick Start

### CLI Commands

```bash
# Essential commands
openspec list                  # List active changes
openspec list --specs          # List specifications
openspec show [item]           # Display change or spec
openspec validate [item]       # Validate changes or specs
openspec archive <change-id> [--yes|-y]   # Archive after deployment (add --yes for non-interactive runs)

# Project management
openspec init [path]           # Initialize OpenSpec
openspec update [path]         # Update instruction files

# Interactive mode
openspec show                  # Prompts for selection
openspec validate              # Bulk validation mode

# Debugging
openspec show [change] --json --deltas-only
openspec validate [change] --strict
```

### Command Flags

- `--json` - Machine-readable output
- `--type change|spec` - Disambiguate items
- `--strict` - Comprehensive validation
- `--no-interactive` - Disable prompts
- `--skip-specs` - Archive without spec updates
- `--yes`/`-y` - Skip confirmation prompts (non-interactive archive)

## Directory Structure

```
openspec/
├── project.md              # Project conventions
├── specs/                  # Current truth - what IS built
│   └── [capability]/       # Single focused capability
│       ├── spec.md         # Requirements and scenarios
│       └── design.md       # Technical patterns
├── changes/                # Proposals - what SHOULD change
│   ├── [change-name]/
│   │   ├── proposal.md     # Why, what, impact
│   │   ├── tasks.md        # Implementation checklist
│   │   ├── design.md       # Technical decisions (optional; see criteria)
│   │   └── specs/          # Delta changes
│   │       └── [capability]/
│   │           └── spec.md # ADDED/MODIFIED/REMOVED
│   └── archive/            # Completed changes
```

## Creating Change Proposals

### Decision Tree

```
New request?
├─ Bug fix restoring spec behavior? → Fix directly
├─ Typo/format/comment? → Fix directly  
├─ New feature/capability? → Create proposal
├─ Breaking change? → Create proposal
├─ Architecture change? → Create proposal
└─ Unclear? → Create proposal (safer)
```

### Proposal Structure

1. **Create directory:** `changes/[change-id]/` (kebab-case, verb-led, unique)

2. **Write proposal.md:**
```markdown
# Change: [Brief description of change]

## Why
[1-2 sentences on problem/opportunity]

## What Changes
- [Bullet list of changes]
- [Mark breaking changes with **BREAKING**]

## Impact
- Affected specs: [list capabilities]
- Affected code: [key files/systems]
```

3. **Create spec deltas:** `specs/[capability]/spec.md`
```markdown
## ADDED Requirements
### Requirement: New Feature
The system SHALL provide...

#### Scenario: Success case
- **WHEN** user performs action
- **THEN** expected result

## MODIFIED Requirements
### Requirement: Existing Feature
[Complete modified requirement]

## REMOVED Requirements
### Requirement: Old Feature
**Reason**: [Why removing]
**Migration**: [How to handle]
```
If multiple capabilities are affected, create multiple delta files under `changes/[change-id]/specs/<capability>/spec.md`—one per capability.

4. **Create tasks.md:**
```markdown
## 1. Implementation
- [ ] 1.1 Create database schema
- [ ] 1.2 Implement API endpoint
- [ ] 1.3 Add frontend component
- [ ] 1.4 Write tests
```

5. **Create design.md when needed:**
Create `design.md` if any of the following apply; otherwise omit it:
- Cross-cutting change (multiple services/modules) or a new architectural pattern
- New external dependency or significant data model changes
- Security, performance, or migration complexity
- Ambiguity that benefits from technical decisions before coding

Minimal `design.md` skeleton:
```markdown
## Context
[Background, constraints, stakeholders]

## Goals / Non-Goals
- Goals: [...]
- Non-Goals: [...]

## Decisions
- Decision: [What and why]
- Alternatives considered: [Options + rationale]

## Risks / Trade-offs
- [Risk] → Mitigation

## Migration Plan
[Steps, rollback]

## Open Questions
- [...]
```

## Spec File Format

### Critical: Scenario Formatting

**CORRECT** (use #### headers):
```markdown
#### Scenario: User login success
- **WHEN** valid credentials provided
- **THEN** return JWT token
```

**WRONG** (don't use bullets or bold):
```markdown
- **Scenario: User login**  ❌
**Scenario**: User login     ❌
### Scenario: User login      ❌
```

Every requirement MUST have at least one scenario.

### Requirement Wording
- Use SHALL/MUST for normative requirements (avoid should/may unless intentionally non-normative)

### Delta Operations

- `## ADDED Requirements` - New capabilities
- `## MODIFIED Requirements` - Changed behavior
- `## REMOVED Requirements` - Deprecated features
- `## RENAMED Requirements` - Name changes

Headers matched with `trim(header)` - whitespace ignored.

#### When to use ADDED vs MODIFIED
- ADDED: Introduces a new capability or sub-capability that can stand alone as a requirement. Prefer ADDED when the change is orthogonal (e.g., adding "Slash Command Configuration") rather than altering the semantics of an existing requirement.
- MODIFIED: Changes the behavior, scope, or acceptance criteria of an existing requirement. Always paste the full, updated requirement content (header + all scenarios). The archiver will replace the entire requirement with what you provide here; partial deltas will drop previous details.
- RENAMED: Use when only the name changes. If you also change behavior, use RENAMED (name) plus MODIFIED (content) referencing the new name.

Common pitfall: Using MODIFIED to add a new concern without including the previous text. This causes loss of detail at archive time. If you aren’t explicitly changing the existing requirement, add a new requirement under ADDED instead.

Authoring a MODIFIED requirement correctly:
1) Locate the existing requirement in `openspec/specs/<capability>/spec.md`.
2) Copy the entire requirement block (from `### Requirement: ...` through its scenarios).
3) Paste it under `## MODIFIED Requirements` and edit to reflect the new behavior.
4) Ensure the header text matches exactly (whitespace-insensitive) and keep at least one `#### Scenario:`.

Example for RENAMED:
```markdown
## RENAMED Requirements
- FROM: `### Requirement: Login`
- TO: `### Requirement: User Authentication`
```

## Troubleshooting

### Common Errors

**"Change must have at least one delta"**
- Check `changes/[name]/specs/` exists with .md files
- Verify files have operation prefixes (## ADDED Requirements)

**"Requirement must have at least one scenario"**
- Check scenarios use `#### Scenario:` format (4 hashtags)
- Don't use bullet points or bold for scenario headers

**Silent scenario parsing failures**
- Exact format required: `#### Scenario: Name`
- Debug with: `openspec show [change] --json --deltas-only`

### Validation Tips

```bash
# Always use strict mode for comprehensive checks
openspec validate [change] --strict

# Debug delta parsing
openspec show [change] --json | jq '.deltas'

# Check specific requirement
openspec show [spec] --json -r 1
```

## Happy Path Script

```bash
# 1) Explore current state
openspec spec list --long
openspec list
# Optional full-text search:
# rg -n "Requirement:|Scenario:" openspec/specs
# rg -n "^#|Requirement:" openspec/changes

# 2) Choose change id and scaffold
CHANGE=add-two-factor-auth
mkdir -p openspec/changes/$CHANGE/{specs/auth}
printf "## Why\n...\n\n## What Changes\n- ...\n\n## Impact\n- ...\n" > openspec/changes/$CHANGE/proposal.md
printf "## 1. Implementation\n- [ ] 1.1 ...\n" > openspec/changes/$CHANGE/tasks.md

# 3) Add deltas (example)
cat > openspec/changes/$CHANGE/specs/auth/spec.md << 'EOF'
## ADDED Requirements
### Requirement: Two-Factor Authentication
Users MUST provide a second factor during login.

#### Scenario: OTP required
- **WHEN** valid credentials are provided
- **THEN** an OTP challenge is required
EOF

# 4) Validate
openspec validate $CHANGE --strict
```

## Multi-Capability Example

```
openspec/changes/add-2fa-notify/
├── proposal.md
├── tasks.md
└── specs/
    ├── auth/
    │   └── spec.md   # ADDED: Two-Factor Authentication
    └── notifications/
        └── spec.md   # ADDED: OTP email notification
```

auth/spec.md
```markdown
## ADDED Requirements
### Requirement: Two-Factor Authentication
...
```

notifications/spec.md
```markdown
## ADDED Requirements
### Requirement: OTP Email Notification
...
```

## Best Practices

### Simplicity First
- Default to <100 lines of new code
- Single-file implementations until proven insufficient
- Avoid frameworks without clear justification
- Choose boring, proven patterns

### Complexity Triggers
Only add complexity with:
- Performance data showing current solution too slow
- Concrete scale requirements (>1000 users, >100MB data)
- Multiple proven use cases requiring abstraction

### Clear References
- Use `file.ts:42` format for code locations
- Reference specs as `specs/auth/spec.md`
- Link related changes and PRs

### Capability Naming
- Use verb-noun: `user-auth`, `payment-capture`
- Single purpose per capability
- 10-minute understandability rule
- Split if description needs "AND"

### Change ID Naming
- Use kebab-case, short and descriptive: `add-two-factor-auth`
- Prefer verb-led prefixes: `add-`, `update-`, `remove-`, `refactor-`
- Ensure uniqueness; if taken, append `-2`, `-3`, etc.

## Tool Selection Guide

| Task | Tool | Why |
|------|------|-----|
| Find files by pattern | Glob | Fast pattern matching |
| Search code content | Grep | Optimized regex search |
| Read specific files | Read | Direct file access |
| Explore unknown scope | Task | Multi-step investigation |

## Error Recovery

### Change Conflicts
1. Run `openspec list` to see active changes
2. Check for overlapping specs
3. Coordinate with change owners
4. Consider combining proposals

### Validation Failures
1. Run with `--strict` flag
2. Check JSON output for details
3. Verify spec file format
4. Ensure scenarios properly formatted

### Missing Context
1. Read project.md first
2. Check related specs
3. Review recent archives
4. Ask for clarification

## Quick Reference

### Stage Indicators
- `changes/` - Proposed, not yet built
- `specs/` - Built and deployed
- `archive/` - Completed changes

### File Purposes
- `proposal.md` - Why and what
- `tasks.md` - Implementation steps
- `design.md` - Technical decisions
- `spec.md` - Requirements and behavior

### CLI Essentials
```bash
openspec list              # What's in progress?
openspec show [item]       # View details
openspec validate --strict # Is it correct?
openspec archive <change-id> [--yes|-y]  # Mark complete (add --yes for automation)
```

Remember: Specs are truth. Changes are proposals. Keep them in sync.
