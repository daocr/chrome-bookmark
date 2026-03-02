import type { EventHandler, EventHandlerContext } from "./types";
import { SubagentCustomEvent, isSubagentCustomEvent } from "@/langgraph/events";

/**
 * 处理子代理自定义事件
 * 处理子代理发送的自定义事件
 */
export class SubagentCustomHandler implements EventHandler<SubagentCustomEvent> {
    canHandle(event: any): event is SubagentCustomEvent {
        return isSubagentCustomEvent(event);
    }

    handle(event: SubagentCustomEvent, context: EventHandlerContext): void {
        console.log(`%c[SubagentCustom] Type: %c${event.subagent_type}%c, Event:`, 'color: #eab308; font-weight: bold', 'color: #06b6d4', 'color: #eab308', event.event);
        // 子代理自定义事件，可以记录到 subagentEvents 中
        context.subagentEvents.push({
            type: "update",
            subagentType: event.subagent_type,
            data: event.event,
        });
        context.updateCurrentMessage({
            subagentEvents: [...context.subagentEvents]
        });
    }
}
