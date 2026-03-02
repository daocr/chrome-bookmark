import type { EventHandler, EventHandlerContext } from "./types";
import type { StreamEvent } from "@/langgraph/events";
import { ThinkingStartHandler } from "./ThinkingStartHandler";
import { ThinkingContentHandler } from "./ThinkingContentHandler";
import { ThinkingEndHandler } from "./ThinkingEndHandler";
import { ToolPlanningHandler } from "./ToolPlanningHandler";
import { ToolExecutionStartHandler } from "./ToolExecutionStartHandler";
import { ToolExecutionEndHandler } from "./ToolExecutionEndHandler";
import { ToolStartHandler } from "./ToolStartHandler";
import { ToolEndHandler } from "./ToolEndHandler";
import { ToolCallHandler } from "./ToolCallHandler";
import { ToolResultHandler } from "./ToolResultHandler";
import { SubagentStartHandler } from "./SubagentStartHandler";
import { SubagentThinkingHandler } from "./SubagentThinkingHandler";
import { SubagentEndHandler } from "./SubagentEndHandler";
import { SubagentErrorHandler } from "./SubagentErrorHandler";
import { SubagentUpdateHandler } from "./SubagentUpdateHandler";
import { SubagentCustomHandler } from "./SubagentCustomHandler";
import { DoneHandler } from "./DoneHandler";
import { ErrorHandler } from "./ErrorHandler";
import { TokenHandler } from "./TokenHandler";
import { LegacyThinkingHandler } from "./LegacyThinkingHandler";

/**
 * 事件处理器注册表
 * 管理所有事件处理器的注册和调度
 */
export class EventHandlerRegistry {
    private handlers: EventHandler[] = [];

    constructor() {
        this.registerDefaultHandlers();
    }

    /**
     * 注册默认的事件处理器
     */
    private registerDefaultHandlers(): void {
        // 思考事件
        this.register(new ThinkingStartHandler());
        this.register(new ThinkingContentHandler());
        this.register(new ThinkingEndHandler());
        this.register(new LegacyThinkingHandler());
        this.register(new ToolPlanningHandler());

        // 工具执行事件
        this.register(new ToolExecutionStartHandler());
        this.register(new ToolStartHandler());
        this.register(new ToolEndHandler());
        this.register(new ToolExecutionEndHandler());
        this.register(new ToolCallHandler());
        this.register(new ToolResultHandler());

        // 子代理事件
        this.register(new SubagentStartHandler());
        this.register(new SubagentThinkingHandler());
        this.register(new SubagentEndHandler());
        this.register(new SubagentErrorHandler());
        this.register(new SubagentUpdateHandler());
        this.register(new SubagentCustomHandler());

        // 通用事件
        this.register(new DoneHandler());
        this.register(new ErrorHandler());
        this.register(new TokenHandler());
    }

    /**
     * 注册一个事件处理器
     */
    register(handler: EventHandler): void {
        this.handlers.push(handler);
    }

    /**
     * 处理事件
     * 找到第一个能处理该事件的处理器并执行
     */
    handle(event: StreamEvent, context: EventHandlerContext): void {
        for (const handler of this.handlers) {
            if (handler.canHandle(event)) {
                handler.handle(event, context);
                return;
            }
        }
        console.warn(`No handler found for event type: ${(event as any).type}`);
    }
}

/**
 * 默认的事件处理器注册表实例
 */
export const defaultEventHandlerRegistry = new EventHandlerRegistry();
