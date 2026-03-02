import type { EventHandler, EventHandlerContext } from "./types";
import { SubagentUpdateEvent, isSubagentUpdateEvent } from "@/langgraph/events";

/**
 * 处理子代理更新事件
 * 处理子代理的状态更新
 */
export class SubagentUpdateHandler implements EventHandler<SubagentUpdateEvent> {
    canHandle(event: any): event is SubagentUpdateEvent {
        return isSubagentUpdateEvent(event);
    }

    handle(event: SubagentUpdateEvent, context: EventHandlerContext): void {
        console.log(`%c[SubagentUpdate] Type: %c${event.subagent_type}%c, Data:`, 'color: #8b5cf6; font-weight: bold', 'color: #06b6d4', 'color: #8b5cf6', event.data);
        // 子代理更新事件，可以记录到 subagentEvents 中
        context.subagentEvents.push({
            type: "update",
            subagentType: event.subagent_type,
            data: event.data,
        });
        context.updateCurrentMessage({
            subagentEvents: [...context.subagentEvents]
        });
    }
}
