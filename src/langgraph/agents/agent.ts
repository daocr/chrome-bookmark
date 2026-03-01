import {START, END, StateGraph} from "@langchain/langgraph";
import {HumanMessage, BaseMessage, AIMessage} from "@langchain/core/messages";
import {AgentState} from "../state";
import {llmCall} from "./model-node";
import {toolNode} from "./tool-node";
import {shouldContinue} from "./routes";

// ============================================================================
// 流式输出类型定义
// ============================================================================

export type StreamEvent =
    | { type: "thinking"; content: string }
    | { type: "tool_call"; tool: string; input: any }
    | { type: "tool_result"; tool: string; output: any }
    | { type: "done"; message: string }
    | { type: "error"; error: string };

export type StreamCallback = (event: StreamEvent) => void;

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

// ============================================================================
// 流式 Agent 调用
// ============================================================================

/**
 * 流式调用 Agent，实时返回思考过程
 *
 * @param input - 用户输入消息
 * @param onEvent - 事件回调函数
 * @returns Agent 执行结果
 *
 * @example
 * ```ts
 * await streamAgent("搜索 React 书签", {
 *     onEvent: (event) => {
 *         if (event.type === "thinking") {
 *             updateUI(event.content);
 *         } else if (event.type === "tool_call") {
 *             showToolExecution(event.tool);
 *         }
 *     }
 * });
 * ```
 */
export async function streamAgent(
    input: string,
    callbacks: {
        onEvent?: StreamCallback;
        onToken?: (token: string) => void;
    } = {}
) {
    const {onEvent} = callbacks;

    console.log("[Agent] Starting agent streaming with input:", input);

    // 添加新的用户消息到历史记录
    messageHistory.push(new HumanMessage(input));

    // 只保留最近30条消息
    if (messageHistory.length > MAX_MESSAGES) {
        messageHistory = messageHistory.slice(-MAX_MESSAGES);
    }

    let fullResult: typeof AgentState.State | null = null;

    try {
        // 使用 stream 方法获取实时更新
        const stream = await agent.stream(
            {
                messages: messageHistory,
                count: 0,
            },
            {
                recursionLimit: 100,
                streamMode: "updates", // 获取每步的状态更新
            }
        );

        // 处理每个流式事件
        for await (const event of stream) {
            console.log("[Agent] Stream event:", event);

            // 处理 llmCall 节点的输出
            if (event.llmCall) {
                const messages = event.llmCall.messages;
                if (messages && messages.length > 0) {
                    const lastMessage = messages[messages.length - 1] as AIMessage;

                    // 发送思考内容
                    if (lastMessage.content) {
                        const content = typeof lastMessage.content === "string"
                            ? lastMessage.content
                            : JSON.stringify(lastMessage.content);
                        onEvent?.({type: "thinking", content});
                    }

                    // 发送工具调用
                    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
                        for (const toolCall of lastMessage.tool_calls) {
                            onEvent?.({
                                type: "tool_call",
                                tool: toolCall.name,
                                input: toolCall.args
                            });
                        }
                    }
                }
            }

            // 处理 toolNode 节点的输出
            if (event.toolNode) {
                const messages = event.toolNode.messages;
                if (messages && messages.length > 0) {
                    for (const msg of messages) {
                        if (msg.name) { // ToolMessage 有 name 属性
                            onEvent?.({
                                type: "tool_result",
                                tool: msg.name,
                                output: msg.content
                            });
                        }
                    }
                }
            }
        }

        // 获取最终结果
        fullResult = await agent.invoke({
            messages: messageHistory,
            count: 0,
        }, {recursionLimit: 100});

        // 提取最终回复
        const lastMessage = fullResult.messages[fullResult.messages.length - 1] as AIMessage;
        const finalContent = typeof lastMessage?.content === "string"
            ? lastMessage.content
            : JSON.stringify(lastMessage?.content);

        onEvent?.({type: "done", message: finalContent});

        // 更新消息历史
        messageHistory = fullResult.messages.slice(-MAX_MESSAGES);

        console.log("[Agent] Agent streaming completed");
        return fullResult;

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        onEvent?.({type: "error", error: errorMsg});
        throw error;
    }
}

/**
 * 简化的流式调用，返回 AsyncGenerator
 *
 * @param input - 用户输入消息
 * @returns 异步生成器，产出流式事件
 *
 * @example
 * ```ts
 * for await (const event of streamAgentSimple("搜索书签")) {
 *     if (event.type === "thinking") {
 *         console.log("思考中:", event.content);
 *     }
 * }
 * ```
 */
export async function* streamAgentSimple(input: string): AsyncGenerator<StreamEvent, typeof AgentState.State | null, unknown> {
    console.log("[Agent] Starting agent streaming (generator) with input:", input);

    // 添加新的用户消息到历史记录
    messageHistory.push(new HumanMessage(input));

    // 只保留最近30条消息
    if (messageHistory.length > MAX_MESSAGES) {
        messageHistory = messageHistory.slice(-MAX_MESSAGES);
    }

    try {
        // 使用 stream 方法获取实时更新
        const stream = await agent.stream(
            {
                messages: messageHistory,
                count: 0,
            },
            {
                recursionLimit: 100,
                streamMode: "updates",
            }
        );

        // 处理每个流式事件
        for await (const event of stream) {
            // 处理 llmCall 节点的输出
            if (event.llmCall) {
                const messages = event.llmCall.messages;
                if (messages && messages.length > 0) {
                    const lastMessage = messages[messages.length - 1] as AIMessage;

                    // 发送思考内容
                    if (lastMessage.content) {
                        const content = typeof lastMessage.content === "string"
                            ? lastMessage.content
                            : JSON.stringify(lastMessage.content);
                        yield {type: "thinking", content};
                    }

                    // 发送工具调用
                    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
                        for (const toolCall of lastMessage.tool_calls) {
                            yield {
                                type: "tool_call",
                                tool: toolCall.name,
                                input: toolCall.args
                            };
                        }
                    }
                }
            }

            // 处理 toolNode 节点的输出
            if (event.toolNode) {
                const messages = event.toolNode.messages;
                if (messages && messages.length > 0) {
                    for (const msg of messages) {
                        if (msg.name) {
                            yield {
                                type: "tool_result",
                                tool: msg.name,
                                output: msg.content
                            };
                        }
                    }
                }
            }
        }

        // 获取最终结果
        const fullResult = await agent.invoke({
            messages: messageHistory,
            count: 0,
        }, {recursionLimit: 100});

        // 提取最终回复
        const lastMessage = fullResult.messages[fullResult.messages.length - 1] as AIMessage;
        const finalContent = typeof lastMessage?.content === "string"
            ? lastMessage.content
            : JSON.stringify(lastMessage?.content);

        yield {type: "done", message: finalContent};

        // 更新消息历史
        messageHistory = fullResult.messages.slice(-MAX_MESSAGES);

        console.log("[Agent] Agent streaming completed");
        return fullResult;

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        yield {type: "error", error: errorMsg};
        throw error;
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
