import {SystemMessage} from "@langchain/core/messages";
import {primaryAgentTools} from "../tools";
import {getLLM} from "./llm-factory";
import {AgentState} from "../state";
import {LangGraphRunnableConfig} from "@langchain/langgraph";

// 使用 Vite ?raw 导入主代理系统提示词
import PRIMARY_AGENT_PROMPT from "./prompt/primary-agent.txt?raw";

// 导出 AgentState 类型供其他模块使用
export type {AgentState};

// ============================================================================
// 流式思考事件类型
// ============================================================================

export interface ThinkingEvent {
    type: "thinking_start" | "thinking_content" | "thinking_end" | "tool_planning";
    content?: string;
    tools?: Array<{name: string; args: any}>;
}

// ============================================================================
// 创建带工具的 LLM 实例
// ============================================================================

/**
 * 创建带工具的 LLM 实例（主代理工具集）
 *
 * 主代理工具包括：
 * - callSubagent: 委派任务给子代理 (explore/analyze/execute)
 * - askQuestion: 向用户提问澄清歧义
 * - requestPlanApproval: 请求用户批准高危操作计划
 * - writeTodo/readTodo: 任务管理和进度跟踪
 */
const createModelWithTools = async () => {
    const llm = await getLLM();
    return llm.bindTools(primaryAgentTools);
};

// ============================================================================
// Model Node - 调用 LLM 并返回响应
// ============================================================================

/**
 * Model Node - 调用 LLM 并返回响应
 *
 * 这个节点会：
 * 1. 接收当前状态（包含消息历史）
 * 2. 调用 LLM，传入系统提示和消息历史
 * 3. 返回 LLM 响应和更新的消息列表
 * 4. 通过 config.writer() 发送思考过程数据
 */
export const llmCall = async (
    state: typeof AgentState.State,
    config?: LangGraphRunnableConfig
) => {
    console.log("[llmCall] Starting LLM invocation...");
    console.log("[llmCall] Current messages:", state.messages);

    // 发送思考开始事件
    config?.writer?.({
        type: "thinking_start",
        content: "正在分析请求...",
    });

    // 每次调用时动态获取最新配置的模型
    const modelWithTools = await createModelWithTools();

    const response = await modelWithTools.invoke([
        new SystemMessage(PRIMARY_AGENT_PROMPT),
        ...state.messages,
    ]);

    console.log("[llmCall] LLM response received:", response);
    console.log("[llmCall] Tool calls:", response.tool_calls);

    // 发送思考内容
    if (response.content) {
        const content = typeof response.content === "string"
            ? response.content
            : JSON.stringify(response.content);
        config?.writer?.({
            type: "thinking_content",
            content,
        });
    }

    // 发送工具调用计划
    if (response.tool_calls && response.tool_calls.length > 0) {
        config?.writer?.({
            type: "tool_planning",
            tools: response.tool_calls.map(tc => ({
                name: tc.name,
                args: tc.args,
            })),
        });
    }

    // 发送思考结束事件
    config?.writer?.({
        type: "thinking_end",
        content: response.tool_calls?.length ? "准备执行工具..." : "思考完成",
    });

    return {
        messages: [response],
        count: state.count + 1,
    };
};
