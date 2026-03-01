import {SystemMessage} from "@langchain/core/messages";
import {primaryAgentTools} from "../tools";
import {getLLM} from "./llm-factory";
import {AgentState} from "../state";

// 使用 Vite ?raw 导入主代理系统提示词
import PRIMARY_AGENT_PROMPT from "./prompt/primary-agent.txt?raw";

// 导出 AgentState 类型供其他模块使用
export type {AgentState};

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

/**
 * Model Node - 调用 LLM 并返回响应
 *
 * 这个节点会：
 * 1. 接收当前状态（包含消息历史）
 * 2. 调用 LLM，传入系统提示和消息历史
 * 3. 返回 LLM 响应和更新的消息列表
 */
export const llmCall = async (state: typeof AgentState.State) => {
    console.log("[llmCall] Starting LLM invocation...");
    console.log("[llmCall] Current messages:", state.messages);

    // 每次调用时动态获取最新配置的模型
    const modelWithTools = await createModelWithTools();

    const response = await modelWithTools.invoke([
        new SystemMessage(PRIMARY_AGENT_PROMPT),
        ...state.messages,
    ]);

    console.log("[llmCall] LLM response received:", response);
    console.log("[llmCall] Tool calls:", response.tool_calls);

    return {
        messages: [response],
        count: state.count + 1,
    };
};
