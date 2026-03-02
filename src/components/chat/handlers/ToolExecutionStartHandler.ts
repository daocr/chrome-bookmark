import type { EventHandler, EventHandlerContext } from "./types";
import { ToolExecutionStartEvent, isToolExecutionStartEvent } from "@/langgraph/events";

/**
 * 处理工具执行开始事件
 * 显示工具执行开始提示
 */
export class ToolExecutionStartHandler implements EventHandler<ToolExecutionStartEvent> {
    canHandle(event: any): event is ToolExecutionStartEvent {
        return isToolExecutionStartEvent(event);
    }

    handle(_event: ToolExecutionStartEvent, context: EventHandlerContext): void {
        console.log(`%c[ToolExecutionStart] Starting tool execution`, 'color: #0ea5e9; font-weight: bold');
        context.thinkingSteps.push({ text: `开始执行工具`, status: "in-progress" });
        context.updateCurrentMessage({ thinking: [...context.thinkingSteps] });
    }
}
