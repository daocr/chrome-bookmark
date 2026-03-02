import { useState, useCallback } from "react";
import { streamAgentWithSubgraphsSimple } from "@/langgraph/agents/agent";
import { defaultEventHandlerRegistry, type EventHandlerContext } from "./handlers";
import type { ThinkingStep } from "./types";

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

        // 可变状态（使用对象包装以便在回调中修改）
        const state = {
            thinkingSteps: [] as ThinkingStep[],
            subagentEvents: [] as SubagentEvent[],
            subagentCallCounts: {
                explore: 0,
                analyze: 0,
                execute: 0,
            } as Record<string, number>,
            currentThinkingIndex: -1,
            currentSubagentCallId: null as string | null,
            accumulatedContent: "",
        };

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

        // 创建事件处理上下文
        const context: EventHandlerContext = {
            get thinkingSteps() { return state.thinkingSteps; },
            get subagentEvents() { return state.subagentEvents; },
            get subagentCallCounts() { return state.subagentCallCounts; },
            get currentThinkingIndex() { return state.currentThinkingIndex; },
            get currentSubagentCallId() { return state.currentSubagentCallId; },
            get accumulatedContent() { return state.accumulatedContent; },
            updateCurrentMessage,
            setCurrentThinkingIndex: (index: number) => { state.currentThinkingIndex = index; },
            setCurrentSubagentCallId: (id: string | null) => { state.currentSubagentCallId = id; },
            setAccumulatedContent: (content: string) => { state.accumulatedContent = content; },
        };

        try {
            // 使用流式调用
            for await (const event of streamAgentWithSubgraphsSimple(input)) {
                defaultEventHandlerRegistry.handle(event, context);
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

// 重新导出 ThinkingStep 类型
export type { ThinkingStep };
