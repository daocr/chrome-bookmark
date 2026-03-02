import type { EventHandler, EventHandlerContext } from "./types";
import { ToolCallEvent, isToolCallEvent } from "@/langgraph/events";

/**
 * 处理工具调用事件
 * 显示工具调用信息
 */
export class ToolCallHandler implements EventHandler<ToolCallEvent> {
    canHandle(event: any): event is ToolCallEvent {
        return isToolCallEvent(event);
    }

    handle(event: ToolCallEvent, _context: EventHandlerContext): void {
        // 工具调用事件，可以记录日志或显示调试信息
        console.log(`%c[ToolCall] Calling tool: %c${event.tool}`, 'color: #8b5cf6; font-weight: bold', 'color: #06b6d4', event.input);
    }
}
