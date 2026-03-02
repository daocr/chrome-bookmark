import type { EventHandler, EventHandlerContext } from "./types";
import { ToolResultEvent, isToolResultEvent } from "@/langgraph/events";

/**
 * 处理工具结果事件
 * 处理工具执行返回的结果
 */
export class ToolResultHandler implements EventHandler<ToolResultEvent> {
    canHandle(event: any): event is ToolResultEvent {
        return isToolResultEvent(event);
    }

    handle(event: ToolResultEvent, _context: EventHandlerContext): void {
        // 尝试将 output 转换为 JSON 对象
        let output = event.output;
        if (typeof output === 'string') {
            try {
                output = JSON.parse(output);
            } catch {
                // 不是 JSON 字符串，保持原样
            }
        }
        // 工具结果事件，可以记录日志或显示调试信息
        console.log(`%c[ToolResult] Tool %c${event.tool} %creturned:`, 'color: #10b981; font-weight: bold', 'color: #06b6d4', 'color: #10b981', output);
    }
}
