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
    | { type: "tool_execution_end"; count: number };

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

// ============================================================================
// 增强版流式 Agent 调用（支持 custom 和 messages 流模式）
// ============================================================================

/**
 * 增强版流式调用 Agent，支持实时显示思考 and LLM token 流
 *
 * @param input - 用户输入消息
 * @param callbacks - 回调函数
 * @returns Agent 执行结果
 *
 * @example
 * ```ts
 * await streamAgentEnhanced("搜索 React 书签", {
 *     onEvent: (event) => {
 *         switch (event.type) {
 *             case "thinking_start":
 *                 showLoadingIndicator();
 *                 break;
 *             case "thinking_content":
 *                 updateThinkingUI(event.content);
 *                 break;
 *             case "tool_planning":
 *                 showToolsPlan(event.tools);
 *                 break;
 *             case "token":
 *                 appendToResponse(event.content);
 *                 break;
 *         }
 *     }
 * });
 * ```
 */
export async function streamAgentEnhanced(
    input: string,
    callbacks: {
        onEvent?: StreamCallback;
    } = {}
) {
    const {onEvent} = callbacks;

    console.log("[Agent] Starting enhanced streaming with input:", input);

    // 添加新的用户消息到历史记录
    messageHistory.push(new HumanMessage(input));

    // 只保留最近30条消息
    if (messageHistory.length > MAX_MESSAGES) {
        messageHistory = messageHistory.slice(-MAX_MESSAGES);
    }

    try {
        // 同时使用 custom 和 messages 流模式
        const stream = await agent.stream(
            {
                messages: messageHistory,
                count: 0,
            },
            {
                recursionLimit: 100,
                streamMode: ["updates", "custom", "messages"],
            }
        );

        // 处理每个流式事件（可能是 [mode, data] 元组形式）
        for await (const chunk of stream) {
            console.log("[Agent] Stream chunk:", chunk);

            // 检查是否是 [mode, data] 元组
            if (Array.isArray(chunk) && chunk.length === 2) {
                const [mode, data] = chunk;

                switch (mode) {
                    case "custom":
                        // 处理自定义思考事件
                        handleCustomEvent(data, onEvent);
                        break;

                    case "messages":
                        // 处理 LLM token 流
                        handleTokenEvent(data, onEvent);
                        break;

                    case "updates":
                        // 处理状态更新
                        handleUpdateEvent(data, onEvent);
                        break;
                }
            } else if (typeof chunk === "object") {
                // 直接的状态更新（兼容旧版本）
                handleUpdateEvent(chunk, onEvent);
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

        onEvent?.({type: "done", message: finalContent});

        // 更新消息历史
        messageHistory = fullResult.messages.slice(-MAX_MESSAGES);

        console.log("[Agent] Enhanced streaming completed");
        return fullResult;

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        onEvent?.({type: "error", error: errorMsg});
        throw error;
    }
}

/**
 * 处理自定义事件（来自 model-node 和 tool-node 的 config.writer()）
 */
function handleCustomEvent(data: any, onEvent?: StreamCallback) {
    // 思考事件（来自 model-node）
    if (data.type === "thinking_start") {
        onEvent?.({
            type: "thinking_start",
            content: data.content || "开始思考...",
        });
    } else if (data.type === "thinking_content") {
        onEvent?.({
            type: "thinking_content",
            content: data.content || "",
        });
    } else if (data.type === "thinking_end") {
        onEvent?.({
            type: "thinking_end",
            content: data.content || "思考完成",
        });
    } else if (data.type === "tool_planning") {
        onEvent?.({
            type: "tool_planning",
            tools: data.tools || [],
        });
    }
    // 工具执行事件（来自 tool-node）
    else if (data.type === "tool_execution_start") {
        onEvent?.({
            type: "tool_execution_start",
            count: data.count || 0,
            tools: data.tools || [],
        });
    } else if (data.type === "tool_start") {
        onEvent?.({
            type: "tool_start",
            name: data.name || "",
            args: data.args,
            index: data.index || 0,
            total: data.total || 1,
        });
    } else if (data.type === "tool_end") {
        onEvent?.({
            type: "tool_end",
            name: data.name || "",
            output: data.output,
            index: data.index || 0,
            total: data.total || 1,
        });
    } else if (data.type === "tool_error") {
        onEvent?.({
            type: "tool_error",
            name: data.name || "",
            error: data.error || "",
            index: data.index || 0,
            total: data.total || 1,
        });
    } else if (data.type === "tool_execution_end") {
        onEvent?.({
            type: "tool_execution_end",
            count: data.count || 0,
        });
    }
}

/**
 * 处理 LLM token 事件（来自 messages 流模式）
 */
function handleTokenEvent(data: any, onEvent?: StreamCallback) {
    // data 可能是 [messageChunk, metadata] 元组
    if (Array.isArray(data) && data.length === 2) {
        const [messageChunk, metadata] = data;
        if (messageChunk?.content) {
            onEvent?.({
                type: "token",
                content: messageChunk.content,
                metadata,
            });
        }
    }
}

/**
 * 处理状态更新事件（来自 updates 流模式）
 */
function handleUpdateEvent(event: any, onEvent?: StreamCallback) {
    // 处理 llmCall 节点的输出
    if (event.llmCall) {
        const messages = event.llmCall.messages;
        if (messages && messages.length > 0) {
            const lastMessage = messages[messages.length - 1] as AIMessage;

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
                if (msg.name) {
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

// ============================================================================
// 增强版流式调用（AsyncGenerator 版本）
// ============================================================================

/**
 * 增强版流式调用，返回 AsyncGenerator
 *
 * @param input - 用户输入消息
 * @returns 异步生成器，产出流式事件
 *
 * @example
 * ```ts
 * for await (const event of streamAgentEnhancedSimple("搜索书签")) {
 *     if (event.type === "thinking_content") {
 *         console.log("思考:", event.content);
 *     } else if (event.type === "token") {
 *         process.stdout.write(event.content);
 *     }
 * }
 * ```
 */
export async function* streamAgentEnhancedSimple(
    input: string
): AsyncGenerator<StreamEvent, typeof AgentState.State | null, unknown> {
    console.log("[Agent] Starting enhanced streaming (generator) with input:", input);

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
            }
        );

        for await (const chunk of stream) {
            if (Array.isArray(chunk) && chunk.length === 2) {
                const [mode, data] = chunk;

                switch (mode) {
                    case "custom":
                        yield* handleCustomEventGenerator(data);
                        break;
                    case "messages":
                        yield* handleTokenEventGenerator(data);
                        break;
                    case "updates":
                        yield* handleUpdateEventGenerator(data);
                        break;
                }
            } else if (typeof chunk === "object") {
                yield* handleUpdateEventGenerator(chunk);
            }
        }

        const fullResult = await agent.invoke({
            messages: messageHistory,
            count: 0,
        }, {recursionLimit: 100});

        const lastMessage = fullResult.messages[fullResult.messages.length - 1] as AIMessage;
        const finalContent = typeof lastMessage?.content === "string"
            ? lastMessage.content
            : JSON.stringify(lastMessage?.content);

        yield {type: "done", message: finalContent};

        messageHistory = fullResult.messages.slice(-MAX_MESSAGES);
        console.log("[Agent] Enhanced streaming completed");
        return fullResult;

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        yield {type: "error", error: errorMsg};
        throw error;
    }
}

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
}

function* handleTokenEventGenerator(data: any): Generator<StreamEvent> {
    if (Array.isArray(data) && data.length === 2) {
        const [messageChunk, metadata] = data;
        if (messageChunk?.content) {
            yield {type: "token", content: messageChunk.content, metadata};
        }
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
