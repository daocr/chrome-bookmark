# Agent 开发规范指南

本文档定义了构建 Agent 架构的规范和最佳实践。

## 目录

- [架构概述](#架构概述)
- [Agent 定义](#agent-定义)
- [Agent 模式](#agent-模式)
- [权限系统](#权限系统)
- [工具系统](#工具系统)
- [Skill 系统](#skill-系统)
- [Agent 生成](#agent-生成)
- [最佳实践](#最佳实践)

---

## 架构概述

Agent 架构由以下核心组件组成：

```
┌─────────────────────────────────────────────────────────────┐
│                        Agent System                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │  Agent      │  │  Tool       │  │  Skill      │       │
│  │  Registry   │  │  Registry   │  │  System     │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Permission System                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Agent 定义

### 数据结构

```typescript
type AgentInfo = {
  name: string                      // Agent 唯一标识符
  description?: string               // 功能描述
  mode: "subagent" | "primary" | "all"  // Agent 模式
  native?: boolean                  // 是否为内置 Agent
  hidden?: boolean                 // 是否在列表中隐藏
  topP?: number                     // Top-p 采样参数
  temperature?: number              // 温度参数
  color?: string                    // UI 显示颜色
  permission: PermissionRule[]     // 权限规则
  model?: {                         // 模型配置
    modelID: string
    providerID: string
  }
  variant?: string                  // 模型变体
  prompt?: string                   // 自定义系统提示词
  options: Record<string, any>      // 扩展选项
  steps?: number                    // 最大执行步数
}
```

### 内置 Agent 示例

#### 1. Build Agent (默认 Agent)

```typescript
{
  name: "build",
  description: "The default agent. Executes tools based on configured permissions.",
  mode: "primary",
  native: true,
  permission: /* 完整权限，允许所有工具 */
}
```

#### 2. Plan Agent (规划模式)

```typescript
{
  name: "plan",
  description: "Plan mode. Disallows all edit tools.",
  mode: "primary",
  native: true,
  permission: /* 禁用编辑工具，仅允许规划和读取 */
}
```

#### 3. Explore Agent (代码探索)

```typescript
{
  name: "explore",
  description: "Fast agent specialized for exploring codebases...",
  mode: "subagent",
  native: true,
  prompt: PROMPT_EXPLORE,  // 专用系统提示
  permission: /* 仅允许只读工具: glob, grep, read, webfetch, websearch */
}
```

---

## Agent 模式

| 模式 | 说明 | 使用场景 |
|------|------|----------|
| `primary` | 主要 Agent，可直接启动 | 用户交互的主要 Agent |
| `subagent` | 子 Agent，只能被 Task 工具调用 | 协作处理特定任务 |
| `all` | 同时支持两种模式 | 灵活用途的 Agent |

---

## 权限系统

### 权限类型

```typescript
type Permission = "allow" | "deny" | "ask"
```

### 权限规则

```typescript
type PermissionRule = {
  permission: string      // 权限类型 (如 "edit", "read", "bash")
  pattern: string          // 匹配模式 (如 "*", "*.env")
  action: Permission      // 允许、拒绝或询问用户
}
```

### 常见权限配置示例

```typescript
// 默认权限配置
const defaults = {
  "*": "allow",              // 默认允许所有
  doom_loop: "ask",          // 死循环需要询问
  external_directory: {
    "*": "ask",               // 外部目录需要询问
    [Truncate.GLOB]: "allow", // 缓存目录允许
  },
  question: "deny",          // 禁用提问工具
  plan_enter: "deny",        // 禁用进入规划模式
  plan_exit: "deny",         // 禁用退出规划模式
  read: {
    "*": "allow",             // 允许读取所有文件
    "*.env": "ask",           // .env 文件需要询问
    "*.env.*": "ask",
    "*.env.example": "allow", // .env.example 允许
  },
}
```

### 权限合并

```typescript
PermissionNext.merge(base, override)
// 后面的规则会覆盖前面的规则
```

---

## 工具系统

### 核心工具列表

| 工具 | ID | 说明 |
|------|-------|------|
| InvalidTool | `invalid` | 无效工具占位符 |
| QuestionTool | `question` | 向用户提问 |
| BashTool | `bash` | 执行 Shell 命令 |
| ReadTool | `read` | 读取文件 |
| GlobTool | `glob` | 文件模式匹配 |
| GrepTool | `grep` | 文件内容搜索 |
| EditTool | `edit` | 编辑文件 |
| WriteTool | `write` | 写入文件 |
| TaskTool | `task` | 启动子 Agent |
| WebFetchTool | `webfetch` | 获取网页内容 |
| WebSearchTool | `websearch` | 网页搜索 |
| CodeSearchTool | `codesearch` | 代码搜索 |
| SkillTool | `skill` | 加载 Skill |
| ApplyPatchTool | `apply_patch` | 应用补丁 |
| LspTool | `lsp` | LSP 功能 |
| PlanExitTool | `plan_exit` | 退出规划模式 |
| PlanEnterTool | `plan_enter` | 进入规划模式 |
| BatchTool | `batch` | 批量操作 |
| TodoWriteTool | `todowrite` | 写入待办事项 |
| TodoReadTool | `todoread` | 读取待办事项 |

### 工具注册

```typescript
// 工具定义接口
type ToolInfo = {
  id: string
  init: (ctx: InitContext) => Promise<{
    description: string
    parameters: ZodSchema
    execute: (args: any, ctx: ExecuteContext) => Promise<ToolResult>
  }>
}

// 内置工具在 ToolRegistry 中注册
// 自定义工具从以下位置加载：
// 1. {tool,tools}/*.{js,ts} (项目目录)
// 2. Plugin 提供的工具
```

### 自定义工具示例

```typescript
// tools/mytool.ts
import z from "zod"
import type { ToolDefinition } from "@opencode-ai/plugin"

export default {
  description: "My custom tool description",
  args: z.object({
    param1: z.string().describe("Parameter 1"),
    param2: z.number().optional(),
  }),
  execute: async (args, ctx) => {
    // 工具逻辑
    return "Tool result output"
  },
} satisfies ToolDefinition
```

---

## Agent 协作机制

### 主 Agent 调用 Subagent 流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        Main Agent Session                       │
│  ┌────────────┐    ┌──────────────────────────────────────┐   │
│  │   Task     Tool Description Shows Available Subagents │   │
│  │   Tool     ├──────────────────────────────────────────►│   │
│  │            │                                            │   │
│  └────────────┘    Available agents:                          │
│                    - explore: Fast codebase explorer          │
│                    - general: Multi-step tasks               │
│                    - code-reviewer: Code review specialist  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Subagent Session (Child)                    │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  Independent context with:                             │     │
│  │  - Subagent-specific system prompt                   │     │
│  │  - Inherited/filtered permissions                    │     │
│  │  - Tool availability based on permissions             │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  Execution until task completion                       │     │
│  │  Returns single message to parent                    │     │
│  └──────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Return to Main Agent                         │
│  Result format:                                               │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  task_id: session-id (for resume)                    │     │
│  │  <task_result>                                          │     │
│  │  Agent's output message                                │     │
│  │  </task_result>                                         │     │
│  └──────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

### Task 工具参数

```typescript
type TaskParams = {
  description: string          // 简短描述 (3-5 词)
  prompt: string              // 传递给 subagent 的任务描述
  subagent_type: string       // 要调用的 subagent 名称
  task_id?: string            // 可选：用于恢复之前的会话
  command?: string            // 可选：触发此任务的命令
}
```

### 调用流程详解

#### 1. 权限检查阶段

```typescript
// 在 Task 工具执行时
if (!ctx.extra?.bypassAgentCheck) {
  await ctx.ask({
    permission: "task",        // 检查是否有权限调用 subagent
    patterns: [params.subagent_type],
    always: ["*"],
    metadata: {
      description: params.description,
      subagent_type: params.subagent_type,
    },
  })
}
```

#### 2. 创建 Subagent 会话

```typescript
// 如果提供了 task_id，则恢复现有会话
if (params.task_id) {
  session = await Session.get(params.task_id)
} else {
  // 创建新会话，继承并过滤权限
  session = await Session.create({
    parentID: ctx.sessionID,     // 绑定父会话
    title: params.description + ` (@${agent.name} subagent)`,
    permission: [
      // 禁用 todo 工具 (每个会话独立管理)
      { permission: "todowrite", pattern: "*", action: "deny" },
      { permission: "todoread", pattern: "*", action: "deny" },
      // 只有 subagent 有 task 权限时才允许嵌套调用
      ...(hasTaskPermission ? [] : [
        { permission: "task", pattern: "*", action: "deny" }
      ]),
    ],
  })
}
```

#### 3. 执行 Subagent

```typescript
// 使用 subagent 的配置执行
const result = await SessionPrompt.prompt({
  sessionID: session.id,
  model: agent.model ?? parent.model,  // 使用 subagent 的模型
  agent: agent.name,                     // subagent 身份
  tools: { /* 基于 subagent 权限过滤 */ },
  parts: await SessionPrompt.resolvePromptParts(params.prompt),
})
```

#### 4. 返回结果

```typescript
// 格式化返回给主 Agent
const output = [
  `task_id: ${session.id} (for resuming to continue this task if needed)`,
  "",
  "<task_result>",
  resultText,      // subagent 的最终输出
  "</task_result>",
].join("\n")
```

### 权限继承与过滤

```typescript
// Subagent 权限规则：
// 1. 继承主 Agent 的权限配置
// 2. 应用 subagent 自身的权限限制
// 3. 工具可用性由最终权限决定

// 示例：Explore Agent 权限配置
{
  permission: [
    // 禁用所有工具
    { permission: "*", pattern: "*", action: "deny" },
    // 明确允许只读工具
    { permission: "glob", pattern: "*", action: "allow" },
    { permission: "grep", pattern: "*", action: "allow" },
    { permission: "read", pattern: "*", action: "allow" },
    { permission: "bash", pattern: "*", action: "allow" },
    { permission: "webfetch", pattern: "*", action: "allow" },
    { permission: "websearch", pattern: "*", action: "allow" },
    // 即使父 Agent 拥有其他权限，subagent 也无法使用
  ],
}
```

### 使用场景与示例

#### 场景 1: 主动调用 Proactive Subagent

```markdown
<!-- 主 Agent 的系统提示词中 -->
When you recognize that a task matches one of the available agents,
use the Task tool to launch the appropriate subagent.

Available agents:
- explore: Fast codebase explorer. Use when searching files/patterns.
- code-reviewer: Expert code reviewer. Use after writing significant code.

Example flow:
User: "Please write a function that checks if a number is prime"
Assistant: [Writes the function]
Assistant: Now let me use the code-reviewer agent to review the code
[Uses Task tool to launch code-reviewer]
```

#### 场景 2: 并行执行多个 Subagent

```markdown
When you can perform independent tasks in parallel,
launch multiple agents concurrently in a single message.

Example:
User: "Analyze the frontend and backend code"
Assistant: I'll explore both codebases in parallel.

[Task call 1: explore agent for "src/frontend/**"]
[Task call 2: explore agent for "src/backend/**"]
```

#### 场景 3: 会话恢复与延续

```typescript
// 首次调用
const result1 = await Task({
  subagent_type: "explore",
  description: "探索组件结构",
  prompt: "找出所有 React 组件的位置",
})
// 返回: task_id: "abc-123"

// 后续恢复
const result2 = await Task({
  task_id: "abc-123",        // 使用之前的 task_id
  prompt: "继续深入分析发现的组件",
})
```

### Subagent 可见性

```typescript
// Task 工具初始化时，过滤可访问的 subagent
const caller = ctx?.agent  // 调用者（主 Agent）
const accessibleAgents = caller
  ? agents.filter((a) => {
      // 检查主 Agent 是否有权限调用此 subagent
      const rule = PermissionNext.evaluate(
        "task",
        a.name,
        caller.permission
      )
      return rule.action !== "deny"
    })
  : agents  // 无调用者限制时，显示所有

// 描述中仅显示可访问的 subagent
const description = `Available agents:
${accessibleAgents.map(a => `- ${a.name}: ${a.description}`).join("\n")}`
```

### 最佳实践

1. **明确的任务描述**: description 字段应简洁清晰，帮助用户理解子任务
2. **详细的 Prompt**: prompt 应包含完整的任务上下文和期望输出格式
3. **善用 task_id**: 对于需要多步骤的复杂任务，保存 task_id 用于后续恢复
4. **并行优先**: 独立任务应并行执行以提高效率
5. **权限隔离**: Subagent 的权限配置应遵循最小权限原则

---

## Skill 系统

Skill 是可插拔的领域特定指令和工作流模块。

### Skill 发现位置

1. **外部目录** (优先级从低到高):
   - `~/.claude/skills/**/SKILL.md` (全局)
   - `{project}/.claude/skills/**/SKILL.md` (项目级)
   - `~/.agents/skills/**/SKILL.md`
   - `{project}/.agents/skills/**/SKILL.md`

2. **内部目录**:
   - `.opencode/skill/**/SKILL.md`

3. **配置指定**:
   - 配置文件中的 `skills.paths` 指定的路径

4. **远程 URL**:
   - 配置文件中的 `skills.urls` 指定的 URL

### SKILL.md 格式

```markdown
---
name: skill-name
description: Brief description of what this skill does
---

# Detailed Instructions

这里是 Skill 的具体指令内容，将被注入到 Agent 的上下文中。

## 工作流程

1. 第一步说明
2. 第二步说明
3. ...

## 最佳实践

- 建议事项 1
- 建议事项 2
```

### Skill 数据结构

```typescript
type SkillInfo = {
  name: string        // Skill 名称 (从 frontmatter 解析)
  description: string // Skill 描述
  location: string    // SKILL.md 文件路径
  content: string     // Markdown 内容
}
```

### 远程 Skill 集成

```typescript
// 从 URL 拉取 Skill
await Discovery.pull("https://example.com/skills/")

// 需要一个 index.json:
{
  "skills": [
    {
      "name": "my-skill",
      "files": ["SKILL.md", "scripts/setup.sh", "reference/api.md"]
    }
  ]
}
```

---

## Agent 生成

使用 AI 自动生成 Agent 配置。

### 生成流程

```typescript
const result = await Agent.generate({
  description: "创建一个用于代码审查的 Agent",
  model: { providerID: "openai", modelID: "gpt-4" }
})

// 返回:
{
  identifier: "code-reviewer",
  whenToUse: "Use this agent when code has been written and needs review...",
  systemPrompt: "You are an expert code reviewer..."
}
```

### 生成提示词原则

1. **提取核心意图**: 识别 Agent 的基本目的和成功标准
2. **设计专家身份**: 创建体现领域知识的专业身份
3. **架构综合指令**:
   - 建立清晰的行为边界
   - 提供具体的方法论和最佳实践
   - 预期边缘情况并提供处理指导
   - 定义输出格式预期
4. **优化性能**:
   - 包含适当的决策框架
   - 质量控制机制
   - 高效的工作流模式

### Identifier 命名规则

- 使用小写字母、数字和连字符
- 通常 2-4 个单词用连字符连接
- 清晰指示 Agent 的主要功能
- 易于记忆和输入
- 避免通用术语如 "helper" 或 "assistant"

**示例**:
- ✅ `code-reviewer`
- ✅ `api-docs-writer`
- ✅ `test-generator`
- ❌ `helper`
- ❌ `assistant`

---

## 最佳实践

### 1. Agent 设计原则

**单一职责**
- 每个 Agent 应专注于特定领域或任务类型
- 避免创建"万能 Agent"

**权限最小化**
- 默认使用最严格的权限配置
- 仅开放必要的工具和资源

**清晰描述**
- description 应明确说明何时使用此 Agent
- 包含使用示例和触发条件

### 2. 提示词工程

```markdown
# 系统 Prompt 最佳实践

## 身份定义
You are a [role] specializing in [domain].

## 核心职责
- 职责 1
- 职责 2

## 使用指南
When to use this agent:
- 场景 1
- 场景 2

## 约束条件
- 约束 1
- 约束 2

## 输出格式
[定义期望的输出格式]
```

### 3. 权限配置

**安全默认值**
```typescript
const safeDefaults = {
  "*": "deny",              // 默认拒绝
  read: { "*": "allow" },   // 明确允许读取
  external_directory: { "*": "ask" },
}
```

**环境感知**
```typescript
const productionRules = {
  "*.env": "deny",          // 生产环境拒绝访问 .env
}
```

### 4. Tool 开发

```typescript
// 工具模板
export const MyTool = Tool.define("my-tool", {
  // 1. 清晰的描述
  description: "Brief description of what this tool does",

  // 2. 使用 Zod Schema 定义参数
  parameters: z.object({
    requiredParam: z.string().describe("Description"),
    optionalParam: z.number().optional().describe("Description"),
  }),

  // 3. 异步执行函数
  async execute(params, ctx) {
    // 参数验证 (由 Zod 自动完成)

    // 权限检查
    await ctx.ask({
      permission: "my-permission",
      patterns: ["*"],
      always: ["*"],
      metadata: {},
    })

    // 业务逻辑
    const result = await doWork(params)

    // 返回格式化结果
    return {
      title: "Short title",
      output: "Tool output content",
      metadata: { /* 额外数据 */ }
    }
  },
})
```

### 5. Skill 组织

**目录结构**
```
skills/
└── my-skill/
    ├── SKILL.md           # 主指令文件
    ├── scripts/           # 辅助脚本
    │   └── setup.sh
    └── reference/         # 参考文档
        └── api.md
```

**SKILL.md 内容**
```markdown
---
name: my-skill
description: Domain-specific instructions for X
---

# Skill Instructions

## 工作流程

1. 步骤 1
2. 步骤 2

## 参考

Base directory for this skill: {base}
Use scripts/setup.sh for initialization.

See reference/api.md for API documentation.
```

### 6. Agent 协作

**使用 Task 工具**
```typescript
// 主动调用子 Agent
if (needsExploration) {
  await Task({
    subagent_type: "explore",
    description: "探索代码库结构",
    prompt: "找出所有组件定义的位置",
  })
}

// 并行执行多个 Agent
await Promise.all([
  Task({ subagent_type: "agent1", ... }),
  Task({ subagent_type: "agent2", ... }),
])
```

**会话恢复**
```typescript
// 使用 task_id 恢复会话
await Task({
  task_id: "previous-task-id",
  prompt: "继续之前的工作",
})
```

---

## 附录

### A. 完整 Agent 配置示例

```typescript
{
  name: "code-reviewer",
  description: "Expert code reviewer that analyzes code for best practices, bugs, and improvements. Use proactively after writing significant code changes.",
  mode: "subagent",
  native: false,
  temperature: 0.3,
  permission: [
    { permission: "*", pattern: "*", action: "deny" },
    { permission: "read", pattern: "*", action: "allow" },
    { permission: "glob", pattern: "*", action: "allow" },
    { permission: "grep", pattern: "*", action: "allow" },
  ],
  prompt: `You are an expert code reviewer with deep knowledge of software engineering best practices.

When reviewing code:
1. Identify potential bugs and edge cases
2. Suggest performance improvements
3. Check adherence to coding standards
4. Provide actionable feedback

Focus on the code that was recently written unless the user specifies otherwise.`,
  options: {},
}
```

### B. 内置 Agent 参考

| Agent | 模式 | 用途 |
|-------|------|------|
| `build` | primary | 默认执行 Agent |
| `plan` | primary | 规划模式 Agent |
| `general` | subagent | 通用多任务 Agent |
| `explore` | subagent | 代码库探索 Agent |
| `compaction` | primary | 消息压缩 (隐藏) |
| `title` | primary | 标题生成 (隐藏) |
| `summary` | primary | 会话摘要 (隐藏) |

### C. 相关文件

- `agent/agent.ts` - Agent 定义和注册
- `tool/*.ts` - 工具实现
- `skill/*.ts` - Skill 系统
- `permission/next.ts` - 权限系统
