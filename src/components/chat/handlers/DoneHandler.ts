import type { EventHandler, EventHandlerContext } from "./types";
import { DoneEvent, isDoneEvent } from "@/langgraph/events";

/**
 * 处理完成事件
 * 最终完成，更新内容
 */
export class DoneHandler implements EventHandler<DoneEvent> {
    canHandle(event: any): event is DoneEvent {
        return isDoneEvent(event);
    }

    handle(event: DoneEvent, context: EventHandlerContext): void {
        console.log(`%c[Done] Message: ${event.message?.substring(0, 50)}...`, 'color: #6b7280; font-weight: bold');
        // 最终完成，更新内容（使用累积的内容或事件消息）
        context.updateCurrentMessage({
            content: context.accumulatedContent || event.message,
            thinking: [...context.thinkingSteps],
            subagentEvents: [...context.subagentEvents]
        });
    }
}
