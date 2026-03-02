import type { EventHandler, EventHandlerContext } from "./types";
import { ErrorEvent, isErrorEvent } from "@/langgraph/events";

/**
 * 处理错误事件
 * 显示错误信息
 */
export class ErrorHandler implements EventHandler<ErrorEvent> {
    canHandle(event: any): event is ErrorEvent {
        return isErrorEvent(event);
    }

    handle(event: ErrorEvent, context: EventHandlerContext): void {
        console.log(`%c[Error] ${event.error}`, 'color: #ef4444; font-weight: bold');
        context.updateCurrentMessage({
            content: `错误: ${event.error}`,
            thinking: [...context.thinkingSteps]
        });
    }
}
