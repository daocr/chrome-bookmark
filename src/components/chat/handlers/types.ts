import { StreamingMessage, SubagentEvent } from "../useStreamingChat";
import type { StreamEvent } from "@/langgraph/events";

/**
 * 事件处理上下文
 * 包含处理事件时需要的所有状态和工具
 */
export interface EventHandlerContext {
    /** 思考步骤列表 */
    thinkingSteps: ThinkingStep[];
    /** 子代理事件列表 */
    subagentEvents: SubagentEvent[];
    /** 子代理调用计数 */
    subagentCallCounts: Record<string, number>;
    /** 当前活动的思考步骤索引 */
    currentThinkingIndex: number;
    /** 当前活动的子代理调用 ID */
    currentSubagentCallId: string | null;
    /** 当前累积的内容 */
    accumulatedContent: string;
    /** 更新当前消息的回调 */
    updateCurrentMessage: (updates: Partial<StreamingMessage>) => void;
    /** 设置当前思考索引的回调 */
    setCurrentThinkingIndex: (index: number) => void;
    /** 设置当前子代理调用 ID 的回调 */
    setCurrentSubagentCallId: (id: string | null) => void;
    /** 设置累积内容的回调 */
    setAccumulatedContent: (content: string) => void;
}

/**
 * 事件处理器接口
 * 所有事件处理器都需要实现这个接口
 */
export interface EventHandler<T extends StreamEvent = StreamEvent> {
    /**
     * 判断是否可以处理该事件
     */
    canHandle(event: StreamEvent): event is T;

    /**
     * 处理事件
     */
    handle(event: T, context: EventHandlerContext): void;
}

/**
 * 思考步骤状态
 */
export type ThinkingStepStatus = "pending" | "in-progress" | "completed";

/**
 * 思考步骤
 */
export interface ThinkingStep {
    text: string;
    status: ThinkingStepStatus;
}
