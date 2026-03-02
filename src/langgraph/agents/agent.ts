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
    | { type: "error"; error: string }
    // 思考事件（来自 model-node）
    | { type: "thinking_start"; content: string }
    | { type: "thinking_content"; content: string }
    | { type: "thinking_end"; content: string }
    | { type: "tool_planning"; tools: Array<{name: string; args: any}> }
    // Token 级别的流式输出
    | { type: "token"; content: string; metadata?: any }
    // 工具执行事件（来自 tool-node）
    | { type: "tool_execution_start"; count: number; tools: Array<{name: string; args: any}> }
    | { type: "tool_start"; name: string; args: any; index: number; total: number }
    | { type: "tool_end"; name: string; output: any; index: number; total: number }
    | { type: "tool_error"; name: string; error: string; index: number; total: number }
    | { type: "tool_execution_end"; count: number }
    // 子代理事件（来自 call_subagent 工具）
    | { type: "subagent_start"; subagent_type: string; description: string; task_id: string }
    | { type: "subagent_thinking"; subagent_type: string; content: string }
    | { type: "subagent_update"; subagent_type: string; data: any }
    | { type: "subagent_custom"; subagent_type: string; event: any }
    | { type: "subagent_end"; subagent_type: string; result: string }
    | { type: "subagent_error"; subagent_type: string; error: string }
    // 子图事件（来自 subgraphs: true）
    | { type: "subgraph_output"; namespace: string[]; data: any }
    | { type: "subgraph_node"; namespace: string[]; node: string; data: any };

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

// ============================================================================
// 流式 Agent 调用
// ============================================================================



function* handleCustomEventGenerator(data: any): Generator<StreamEvent> {
    // 思考事件（来自 model-node）
    if (data.type === "thinking_start") {
        yield {type: "thinking_start", content: data.content || "开始思考..."};
    } else if (data.type === "thinking_content") {
        yield {type: "thinking_content", content: data.content || ""};
    } else if (data.type === "thinking_end") {
        yield {type: "thinking_end", content: data.content || "思考完成"};
    } else if (data.type === "tool_planning") {
        yield {type: "tool_planning", tools: data.tools || []};
    }
    // 工具执行事件（来自 tool-node）
    else if (data.type === "tool_execution_start") {
        yield {type: "tool_execution_start", count: data.count || 0, tools: data.tools || []};
    } else if (data.type === "tool_start") {
        yield {type: "tool_start", name: data.name || "", args: data.args, index: data.index || 0, total: data.total || 1};
    } else if (data.type === "tool_end") {
        yield {type: "tool_end", name: data.name || "", output: data.output, index: data.index || 0, total: data.total || 1};
    } else if (data.type === "tool_error") {
        yield {type: "tool_error", name: data.name || "", error: data.error || "", index: data.index || 0, total: data.total || 1};
    } else if (data.type === "tool_execution_end") {
        yield {type: "tool_execution_end", count: data.count || 0};
    }
    // 子代理事件（来自 call_subagent 工具）
    else if (data.type === "subagent_start") {
        yield {
            type: "subagent_start",
            subagent_type: data.subagent_type || "",
            description: data.description || "",
            task_id: data.task_id || ""
        };
    } else if (data.type === "subagent_thinking") {
        yield {type: "subagent_thinking", subagent_type: data.subagent_type || "", content: data.content || ""};
    } else if (data.type === "subagent_update") {
        yield {type: "subagent_update", subagent_type: data.subagent_type || "", data: data.data};
    } else if (data.type === "subagent_custom") {
        yield {type: "subagent_custom", subagent_type: data.subagent_type || "", event: data.event};
    } else if (data.type === "subagent_end") {
        yield {type: "subagent_end", subagent_type: data.subagent_type || "", result: data.result || ""};
    } else if (data.type === "subagent_error") {
        yield {type: "subagent_error", subagent_type: data.subagent_type || "", error: data.error || ""};
    }
}


function* handleUpdateEventGenerator(event: any): Generator<StreamEvent> {
    if (event.llmCall) {
        const messages = event.llmCall.messages;
        if (messages && messages.length > 0) {
            const lastMessage = messages[messages.length - 1] as AIMessage;
            if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
                for (const toolCall of lastMessage.tool_calls) {
                    yield {type: "tool_call", tool: toolCall.name, input: toolCall.args};
                }
            }
        }
    }
    if (event.toolNode) {
        const messages = event.toolNode.messages;
        if (messages && messages.length > 0) {
            for (const msg of messages) {
                if (msg.name) {
                    yield {type: "tool_result", tool: msg.name, output: msg.content};
                }
            }
        }
    }
}

// ============================================================================
// 支持子图输出的流式调用
// ============================================================================
/**
 * AsyncGenerator 版本的子图流式调用
 *
 * @param input - 用户输入消息
 * @returns 异步生成器，产出流式事件
 *
 * @example
 * ```ts
 * for await (const event of streamAgentWithSubgraphsSimple("搜索书签")) {
 *     if (event.type === "subgraph_output") {
 *         console.log("子图:", event.namespace, event.data);
 *     }
 * }
 * ```
 */
export async function* streamAgentWithSubgraphsSimple(
    input: string
): AsyncGenerator<StreamEvent, typeof AgentState.State | null, unknown> {
    console.log("[Agent] Starting streaming with subgraphs (generator) for input:", input);

    // 添加新的用户消息到历史记录
    messageHistory.push(new HumanMessage(input));

    // 只保留最近30条消息
    if (messageHistory.length > MAX_MESSAGES) {
        messageHistory = messageHistory.slice(-MAX_MESSAGES);
    }

    try {
        const stream = await agent.stream(
            {
                messages: messageHistory,
                count: 0,
            },
            {
                recursionLimit: 100,
                streamMode: ["updates", "custom", "messages"],
                subgraphs: true,
            }
        );

        let lastMainUpdate: any = null;

        for await (const chunk of stream) {
            // 当使用 subgraphs: true 和多个 streamMode 时，chunk 是 [namespace, mode, data] 三元组
            if (Array.isArray(chunk) && chunk.length === 3) {
                const [namespace, mode, data] = chunk as [any, string, any];

                // 处理自定义事件
                if (mode === "custom") {
                    yield* handleCustomEventGenerator(data);
                }
                // 处理 messages 模式（LLM token 流）
                else if (mode === "messages") {
                    // data 是 [messageChunk, metadata] 元组
                    if (Array.isArray(data) && data.length === 2) {
                        const [messageChunk, metadata] = data;
                        if (messageChunk?.content) {
                            yield {
                                type: "token",
                                content: messageChunk.content,
                                metadata,
                            };
                        }
                    }
                }
                // 处理更新事件
                else if (mode === "updates") {
                    if (Array.isArray(namespace) && namespace.length === 0) {
                        // 主图的输出 - 保存最后一次更新
                        lastMainUpdate = data;
                        yield* handleUpdateEventGenerator(data);
                    } else {
                        // 子图的输出
                        yield {
                            type: "subgraph_output",
                            namespace,
                            data,
                        };

                        // 处理子图中的每个节点
                        for (const [node, nodeData] of Object.entries(data)) {
                            yield {
                                type: "subgraph_node",
                                namespace,
                                node,
                                data: nodeData,
                            };
                        }
                    }
                }
            }
            // 兼容旧版本（没有 subgraphs 的情况）
            else if (typeof chunk === "object") {
                lastMainUpdate = chunk;
                yield* handleUpdateEventGenerator(chunk);
            }
        }

        // 从最后的更新中构建完整结果
        let fullResult: any = { messages: [] };
        if (lastMainUpdate) {
            // 合并所有节点的更新到最终状态
            for (const nodeName in lastMainUpdate) {
                const nodeData = lastMainUpdate[nodeName];
                if (nodeData.messages) {
                    fullResult.messages.push(...nodeData.messages);
                }
            }
        } else {
            throw new Error("未能从 agent 流中获取最终结果");
        }

        const lastMessage = fullResult.messages[fullResult.messages.length - 1] as AIMessage;
        const finalContent = typeof lastMessage?.content === "string"
            ? lastMessage.content
            : JSON.stringify(lastMessage?.content);

        yield {type: "done", message: finalContent};

        messageHistory = fullResult.messages.slice(-MAX_MESSAGES);
        console.log("[Agent] Streaming with subgraphs completed");
        return fullResult;

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        yield {type: "error", error: errorMsg};
        throw error;
    }
}
