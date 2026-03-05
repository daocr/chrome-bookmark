import {START, END, StateGraph} from "@langchain/langgraph";
import {HumanMessage, BaseMessage, AIMessage} from "@langchain/core/messages";
import {AgentState} from "../state";
import {llmCall} from "./model-node";
import {toolNode} from "./tool-node";
import {shouldContinue} from "./routes";
import {
    StreamEvent,
    // 事件类型常量
    THINKING_START,
    THINKING_CONTENT,
    THINKING_END,
    TOOL_PLANNING,
    TOOL_EXECUTION_START,
    TOOL_START,
    TOOL_END,
    TOOL_ERROR,
    TOOL_EXECUTION_END,
    SUBAGENT_START,
    SUBAGENT_THINKING,
    SUBAGENT_UPDATE,
    SUBAGENT_CUSTOM,
    SUBAGENT_END,
    SUBAGENT_ERROR,
    TOKEN,
    DONE,
    ERROR,
    TOOL_CALL,
    TOOL_RESULT,
} from "../events";

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


function* handleCustomEventGenerator(data: any): Generator<StreamEvent> {
    // 思考事件（来自 model-node）
    if (data.type === THINKING_START) {
        yield {type: THINKING_START, content: data.content || "开始思考..."};
    } else if (data.type === THINKING_CONTENT) {
        yield {type: THINKING_CONTENT, content: data.content || ""};
    } else if (data.type === THINKING_END) {
        yield {type: THINKING_END, content: data.content || "思考完成"};
    } else if (data.type === TOOL_PLANNING) {
        yield {type: TOOL_PLANNING, tools: data.tools || []};
    }
    // 工具执行事件（来自 tool-node）
    else if (data.type === TOOL_EXECUTION_START) {
        yield {type: TOOL_EXECUTION_START, count: data.count || 0, tools: data.tools || []};
    } else if (data.type === TOOL_START) {
        yield {
            type: TOOL_START,
            name: data.name || "",
            args: data.args,
            index: data.index || 0,
            total: data.total || 1
        };
    } else if (data.type === TOOL_END) {
        yield {
            type: TOOL_END,
            name: data.name || "",
            output: data.output,
            index: data.index || 0,
            total: data.total || 1
        };
    } else if (data.type === TOOL_ERROR) {
        yield {
            type: TOOL_ERROR,
            name: data.name || "",
            error: data.error || "",
            index: data.index || 0,
            total: data.total || 1
        };
    } else if (data.type === TOOL_EXECUTION_END) {
        yield {type: TOOL_EXECUTION_END, count: data.count || 0};
    }
    // 子代理事件（来自 call_subagent 工具）
    else if (data.type === SUBAGENT_START) {
        yield {
            type: SUBAGENT_START,
            subagent_type: data.subagent_type || "",
            description: data.description || "",
            task_id: data.task_id || ""
        };
    } else if (data.type === SUBAGENT_THINKING) {
        yield {type: SUBAGENT_THINKING, subagent_type: data.subagent_type || "", content: data.content || ""};
    } else if (data.type === SUBAGENT_UPDATE) {
        yield {type: SUBAGENT_UPDATE, subagent_type: data.subagent_type || "", data: data.data};
    } else if (data.type === SUBAGENT_CUSTOM) {
        yield {type: SUBAGENT_CUSTOM, subagent_type: data.subagent_type || "", event: data.event};
    } else if (data.type === SUBAGENT_END) {
        yield {type: SUBAGENT_END, subagent_type: data.subagent_type || "", result: data.result || ""};
    } else if (data.type === SUBAGENT_ERROR) {
        yield {type: SUBAGENT_ERROR, subagent_type: data.subagent_type || "", error: data.error || ""};
    }
}


function* handleUpdateEventGenerator(event: any): Generator<StreamEvent> {
    if (event.llmCall) {
        const messages = event.llmCall.messages;
        if (messages && messages.length > 0) {
            const lastMessage = messages[messages.length - 1] as AIMessage;
            if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
                for (const toolCall of lastMessage.tool_calls) {
                    yield {type: TOOL_CALL, tool: toolCall.name, input: toolCall.args};
                }
            }
        }
    }
    if (event.toolNode) {
        const messages = event.toolNode.messages;
        if (messages && messages.length > 0) {
            for (const msg of messages) {
                if (msg.name) {
                    yield {type: TOOL_RESULT, tool: msg.name, output: msg.content};
                }
            }
        }
    }
}

// ============================================================================
// 支持子图输出的流式调用
// ============================================================================
/**
 * AsyncGenerator 版本的流式调用
 *
 * @param input - 用户输入消息
 * @returns 异步生成器，产出流式事件
 *
 * @example
 * ```ts
 * for await (const event of streamAgentWithSubgraphsSimple("搜索书签")) {
 *     if (event.type === "token") {
 *         console.log("Token:", event.content);
 *     }
 * }
 * ```
 */
export async function* streamAgentWithSubgraphsSimple(
    input: string
): AsyncGenerator<StreamEvent, typeof AgentState.State | null, unknown> {
    console.log("[Agent] Starting streaming (generator) for input:", input);

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

        let lastMainUpdate: any = null;

        for await (const chunk of stream) {
            // console.log("🔍 [DEBUG] chunk:", JSON.stringify(chunk, null, 2));
            // 当使用多个 streamMode 时，chunk 是 (mode, data) 二元组
            if (Array.isArray(chunk) && chunk.length === 2) {
                const [mode, data] = chunk as [string, any];
                // console.log(`🔍 [DEBUG] mode: ${mode}`);

                // 处理自定义事件
                if (mode === "custom") {
                    // console.log("🎨 [EVENT] custom:", data.type);
                    yield* handleCustomEventGenerator(data);
                }
                // 处理 messages 模式（LLM token 流）
                else if (mode === "messages") {
                    // console.log("📝 [EVENT] messages mode");
                    if (Array.isArray(data)) {
                        // 解构赋值，兼容不同长度的数组
                        const [messageChunk, metadata] = data;

                        // 如果非要调试，只打印安全的 content
                        // console.log("🔍 [DEBUG] token:", messageChunk?.content);

                        if (messageChunk?.content) {
                            yield {
                                type: TOKEN,
                                content: messageChunk.content,
                                metadata: metadata || {},
                            };
                        }
                    }
                }
                // 处理更新事件
                else if (mode === "updates") {
                    // console.log("🔄 [EVENT] updates:", Object.keys(data));
                    lastMainUpdate = data;
                    yield* handleUpdateEventGenerator(data);
                }
            }
            // 兼容旧版本（单一 streamMode 的情况）
            else if (typeof chunk === "object") {
                lastMainUpdate = chunk;
                yield* handleUpdateEventGenerator(chunk);
            }
        }

        // 从最后的更新中构建完整结果
        let fullResult: any = {messages: []};
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

        yield {type: DONE, message: finalContent};

        messageHistory = fullResult.messages.slice(-MAX_MESSAGES);
        console.log("[Agent] Streaming completed");
        return fullResult;

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        yield {type: ERROR, error: errorMsg};
        throw error;
    }
}
