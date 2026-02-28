import {START, END, StateGraph} from "@langchain/langgraph";
import {HumanMessage, BaseMessage} from "@langchain/core/messages";
import {AgentState} from "../state";
import {llmCall} from "./model-node";
import {toolNode} from "./tool-node";
import {shouldContinue} from "./routes";

const MAX_MESSAGES = 30;

/**
 * 全局消息历史，保留最近30条记录
 */
let messageHistory: BaseMessage[] = [];

/**
 * 创建并编译 Agent Graph
 *
 * Graph 结构：
 * START → llmCall → (shouldContinue) → toolNode → llmCall → ...
 *                    ↘ END
 */
export const agent = new StateGraph(AgentState)
    .addNode("llmCall", llmCall)
    .addNode("toolNode", toolNode)
    .addEdge(START, "llmCall")
    .addConditionalEdges("llmCall", shouldContinue, ["toolNode", END])
    .addEdge("toolNode", "llmCall")
    .compile();

/**
 * 调用 Agent 的便捷函数
 *
 * @param input - 用户输入消息
 * @returns Agent 执行结果
 */
export async function invokeAgent(input: string) {
    console.log("[Agent] Starting agent invocation with input:", input);

    // 添加新的用户消息到历史记录
    messageHistory.push(new HumanMessage(input));

    // 只保留最近30条消息
    if (messageHistory.length > MAX_MESSAGES) {
        messageHistory = messageHistory.slice(-MAX_MESSAGES);
    }

    const result = await agent.invoke({
        messages: messageHistory,
        count: 0,
    }, {recursionLimit: 100});

    // 更新消息历史（包含 Agent 的响应）
    messageHistory = result.messages.slice(-MAX_MESSAGES);

    console.log("[Agent] Agent invocation completed");
    console.log("[Agent] Result:", result);

    return result;
}

/**
 * 打印 Agent 执行结果
 *
 * @param result - Agent 返回的结果
 */
export function printResult(result: typeof AgentState.State) {
    for (const message of result.messages) {
        const msg = message as any;
        console.log(`[${msg.type}]: ${msg.text || msg.content || JSON.stringify(msg)}`);
    }
}

/**
 * 示例：直接调用 Agent
 */
export async function example() {
    const result = await invokeAgent("帮我搜索包含 'github' 的书签");

    printResult(result);

    return result;
}
