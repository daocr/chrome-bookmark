import {AIMessage} from "@langchain/core/messages";
import {END} from "@langchain/langgraph";
import {AgentState} from "../state";

// 导出 AgentState 类型供其他模块使用
export type {AgentState};

/**
 * 条件路由 - 决定下一步执行哪个节点
 *
 * 路由逻辑：
 * - 如果最后一条消息包含 tool_calls → 返回 "toolNode"
 * - 否则 → 返回 END（结束对话）
 *
 * @param state - 当前状态
 * @returns "toolNode" | END
 */
export const shouldContinue = (state: typeof AgentState.State): typeof END | "toolNode" => {
    const messages = state.messages as any[];
    const lastMessage = messages[messages.length - 1];

    // Check if it's an AIMessage before accessing tool_calls
    if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
        return END;
    }

    // If the LLM makes a tool call, then perform an action
    if (lastMessage.tool_calls?.length) {
        return "toolNode";
    }

    // Otherwise, we stop (reply to the user)
    return END;
};

