import { useState, useCallback } from "react";
import { streamAgentWithSubgraphsSimple } from "@/langgraph/agents/agent";
import { ThinkingStep } from "./types";

export interface StreamingMessage {
    role: "user" | "assistant";
    content: string;
    timestamp?: string;
    thinking?: ThinkingStep[];
    subagentEvents?: SubagentEvent[];
}

export interface SubagentEvent {
    type: "start" | "thinking" | "update" | "end" | "error";
    subagentType: string;
    description?: string;
    content?: string;
    data?: any;
    callIndex?: number;  // 第几次调用该类型的子代理
}

/**
 * 支持流式输出的聊天 Hook
 *
 * 功能：
 * - 实时显示 LLM 思考过程
 * - 显示工具执行进度
 * - 显示子代理执行状态
 * - 流式显示最终响应
 * - 正确处理多次调用同一子代理的情况
 * - 正确处理主 agent 多次思考的情况
 */
export function useStreamingChat() {
    const [messages, setMessages] = useState<StreamingMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = useCallback(async (input: string): Promise<void> => {
        if (!input.trim()) return;

        const timestamp = new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });

        // Add user message
        const userMessage: StreamingMessage = {
            role: "user",
            content: input,
            timestamp,
        };
        setMessages((prev) => [...prev, userMessage]);

        setIsLoading(true);

        // 立即创建一个空的 assistant message，用于实时更新
        const initialAssistantMessage: StreamingMessage = {
            role: "assistant",
            content: "",
            timestamp,
            thinking: [],
            subagentEvents: [],
        };
        setMessages((prev) => [...prev, initialAssistantMessage]);

        const thinkingSteps: ThinkingStep[] = [];
        const subagentEvents: SubagentEvent[] = [];

        // 跟踪每种子代理的调用次数
        const subagentCallCounts: Record<string, number> = {
            explore: 0,
            analyze: 0,
            execute: 0,
        };

        // 当前活动的思考步骤索引（用于更新正确的步骤）
        let currentThinkingIndex = -1;

        // 当前活动的子代理调用 ID（用于更新正确的步骤）
        let currentSubagentCallId: string | null = null;

        // 当前累积的内容（用于打字机效果）
        let accumulatedContent = "";

        // 实时更新消息的函数
        const updateCurrentMessage = (updates: Partial<StreamingMessage>) => {
            setMessages((prev) => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage?.role === "assistant") {
                    newMessages[newMessages.length - 1] = {
                        ...lastMessage,
                        ...updates,
                    };
                }
                return newMessages;
            });
        };

        try {
            // 使用流式调用
            for await (const event of streamAgentWithSubgraphsSimple(input)) {
                switch (event.type) {
                    case "thinking_start":
                        // 主 agent 开始新的思考，创建新步骤
                        currentThinkingIndex = thinkingSteps.length;
                        thinkingSteps.push({ text: event.content, status: "in-progress" });
                        updateCurrentMessage({ thinking: [...thinkingSteps] });
                        break;

                    case "thinking_content":
                        // 更新当前活动的思考步骤
                        if (currentThinkingIndex >= 0 && currentThinkingIndex < thinkingSteps.length) {
                            thinkingSteps[currentThinkingIndex] = {
                                text: event.content,
                                status: "in-progress"
                            };
                        } else {
                            // 如果没有活动的思考步骤，创建新的（防御性编程）
                            currentThinkingIndex = thinkingSteps.length;
                            thinkingSteps.push({ text: event.content, status: "in-progress" });
                        }
                        updateCurrentMessage({ thinking: [...thinkingSteps] });
                        break;

                    case "thinking_end":
                        // 完成当前活动的思考步骤
                        if (currentThinkingIndex >= 0 && currentThinkingIndex < thinkingSteps.length) {
                            thinkingSteps[currentThinkingIndex] = {
                                text: event.content,
                                status: "completed"
                            };
                        }
                        currentThinkingIndex = -1; // 重置
                        updateCurrentMessage({ thinking: [...thinkingSteps] });
                        break;

                    case "tool_planning":
                        thinkingSteps.push({ text: `计划使用 ${event.tools.length} 个工具`, status: "completed" });
                        for (const tool of event.tools) {
                            thinkingSteps.push({ text: `等待调用: ${tool.name}`, status: "pending" });
                        }
                        updateCurrentMessage({ thinking: [...thinkingSteps] });
                        break;

                    case "tool_execution_start":
                        thinkingSteps.push({ text: `开始执行工具`, status: "in-progress" });
                        updateCurrentMessage({ thinking: [...thinkingSteps] });
                        break;

                    case "tool_start":
                        // 更新对应的工具状态
                        const toolIndex = thinkingSteps.findIndex(s =>
                            s.text.includes(`等待调用: ${event.name}`) ||
                            s.text.includes(`执行工具: ${event.name}`)
                        );
                        if (toolIndex >= 0) {
                            thinkingSteps[toolIndex] = { text: `执行中: ${event.name}`, status: "in-progress" };
                        }
                        updateCurrentMessage({ thinking: [...thinkingSteps] });
                        break;

                    case "tool_end":
                        const endIndex = thinkingSteps.findIndex(s =>
                            s.text.includes(`等待调用: ${event.name}`) ||
                            s.text.includes(`执行中: ${event.name}`) ||
                            s.text.includes(`执行工具: ${event.name}`)
                        );
                        if (endIndex >= 0) {
                            thinkingSteps[endIndex] = { text: `完成: ${event.name}`, status: "completed" };
                        }
                        updateCurrentMessage({ thinking: [...thinkingSteps] });
                        break;

                    case "subagent_start":
                        // 增加该类型子代理的调用计数
                        subagentCallCounts[event.subagent_type] =
                            (subagentCallCounts[event.subagent_type] || 0) + 1;
                        const callIndex = subagentCallCounts[event.subagent_type];
                        const callId = `${event.subagent_type}_${callIndex}`;

                        // 创建带调用编号的步骤
                        const stepText = callIndex === 1
                            ? `[${event.subagent_type}] ${event.description}`
                            : `[${event.subagent_type} #${callIndex}] ${event.description}`;

                        thinkingSteps.push({
                            text: stepText,
                            status: "in-progress"
                        });
                        currentSubagentCallId = callId;

                        subagentEvents.push({
                            type: "start",
                            subagentType: event.subagent_type,
                            description: event.description,
                            callIndex,
                        });
                        updateCurrentMessage({
                            thinking: [...thinkingSteps],
                            subagentEvents: [...subagentEvents]
                        });
                        break;

                    case "subagent_thinking":
                        // 使用当前活动的子代理调用 ID 来查找和更新步骤
                        if (currentSubagentCallId) {
                            // 从后往前查找最后一个匹配该子代理类型的步骤
                            let stepIndex = -1;
                            for (let i = thinkingSteps.length - 1; i >= 0; i--) {
                                if (thinkingSteps[i].text.startsWith(`[${event.subagent_type}`)) {
                                    stepIndex = i;
                                    break;
                                }
                            }

                            if (stepIndex >= 0) {
                                // 更新现有步骤，保留调用编号和前缀
                                const currentText = thinkingSteps[stepIndex].text;
                                const parts = currentText.split(' - ');
                                const prefix = parts[0]; // 保留 "[explore #2]" 部分
                                thinkingSteps[stepIndex] = {
                                    text: parts.length > 1
                                        ? `${prefix} - ${event.content}`
                                        : `${prefix} - ${event.content}`,
                                    status: "in-progress"
                                };
                            }
                        }
                        updateCurrentMessage({ thinking: [...thinkingSteps] });
                        break;

                    case "subagent_end":
                        // 标记子代理完成
                        const endCallIndex = subagentCallCounts[event.subagent_type];

                        // 从后往前查找最后一个匹配的步骤
                        let stepIndex = -1;
                        for (let i = thinkingSteps.length - 1; i >= 0; i--) {
                            if (thinkingSteps[i].text.startsWith(`[${event.subagent_type}`)) {
                                stepIndex = i;
                                break;
                            }
                        }

                        if (stepIndex >= 0) {
                            thinkingSteps[stepIndex] = {
                                text: endCallIndex === 1
                                    ? `[${event.subagent_type}] 完成`
                                    : `[${event.subagent_type} #${endCallIndex}] 完成`,
                                status: "completed"
                            };
                        }

                        subagentEvents.push({
                            type: "end",
                            subagentType: event.subagent_type,
                            content: event.result,
                            callIndex: endCallIndex,
                        });

                        // 重置当前活动调用
                        currentSubagentCallId = null;

                        updateCurrentMessage({
                            thinking: [...thinkingSteps],
                            subagentEvents: [...subagentEvents]
                        });
                        break;

                    case "subagent_error":
                        const errorCallIndex = subagentCallCounts[event.subagent_type];
                        thinkingSteps.push({
                            text: errorCallIndex === 1
                                ? `[${event.subagent_type}] 错误`
                                : `[${event.subagent_type} #${errorCallIndex}] 错误`,
                            status: "pending"
                        });
                        subagentEvents.push({
                            type: "error",
                            subagentType: event.subagent_type,
                            content: event.error,
                            callIndex: errorCallIndex,
                        });
                        currentSubagentCallId = null;
                        updateCurrentMessage({
                            thinking: [...thinkingSteps],
                            subagentEvents: [...subagentEvents]
                        });
                        break;

                    case "done":
                        // 最终完成，更新内容（使用累积的内容或事件消息）
                        updateCurrentMessage({
                            content: accumulatedContent || event.message,
                            thinking: [...thinkingSteps],
                            subagentEvents: [...subagentEvents]
                        });
                        break;

                    case "error":
                        updateCurrentMessage({
                            content: `错误: ${event.error}`,
                            thinking: [...thinkingSteps]
                        });
                        break;

                    case "token":
                        // 实时显示 token 流（使用本地变量避免异步 state 更新问题）
                        accumulatedContent += event.content;
                        updateCurrentMessage({ content: accumulatedContent });
                        break;
                }
            }

        } catch (error) {
            console.error("Agent streaming error:", error);
            updateCurrentMessage({
                content: `Error: ${error instanceof Error ? error.message : String(error)}`,
            });
        } finally {
            setIsLoading(false);
        }
    }, [messages]);

    return {
        messages,
        isLoading,
        handleSubmit,
        setMessages,
    };
}
