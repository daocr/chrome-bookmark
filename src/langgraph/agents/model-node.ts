import {SystemMessage} from "@langchain/core/messages";
import {bookmarkTools} from "../tools";
import {getLLM} from "./llm-factory";
import {AgentState} from "../state";

// 导出 AgentState 类型供其他模块使用
export type {AgentState};

/**
 * 创建带书签工具的 LLM 实例（动态获取最新配置）
 */
const createModelWithTools = async () => {
    const llm = await getLLM();
    return llm.bindTools(bookmarkTools);
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
        new SystemMessage(
            "You are a helpful assistant for managing Chrome bookmarks. " +
            "You can help users create, search, move, update, and delete bookmarks. " +
            "Always explain what actions you're taking before performing them."
        ),
        ...state.messages,
    ]);

    console.log("[llmCall] LLM response received:", response);
    console.log("[llmCall] Tool calls:", response.tool_calls);

    return {
        messages: [response],
        count: state.count + 1,
    };
};
