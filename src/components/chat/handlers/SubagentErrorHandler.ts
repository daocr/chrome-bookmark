import type { EventHandler, EventHandlerContext } from "./types";
import { SubagentErrorEvent, isSubagentErrorEvent } from "@/langgraph/events";

/**
 * 处理子代理错误事件
 * 显示子代理执行错误
 */
export class SubagentErrorHandler implements EventHandler<SubagentErrorEvent> {
    canHandle(event: any): event is SubagentErrorEvent {
        return isSubagentErrorEvent(event);
    }

    handle(event: SubagentErrorEvent, context: EventHandlerContext): void {
        console.log(`%c[SubagentError] Type: %c${event.subagent_type}%c, Error: ${event.error?.substring(0, 50)}...`, 'color: #dc2626; font-weight: bold', 'color: #06b6d4', 'color: #dc2626');
        const errorCallIndex = context.subagentCallCounts[event.subagent_type];
        context.thinkingSteps.push({
            text: errorCallIndex === 1
                ? `[${event.subagent_type}] 错误`
                : `[${event.subagent_type} #${errorCallIndex}] 错误`,
            status: "pending"
        });
        context.subagentEvents.push({
            type: "error",
            subagentType: event.subagent_type,
            content: event.error,
            callIndex: errorCallIndex,
        });
        context.setCurrentSubagentCallId(null);
        context.updateCurrentMessage({
            thinking: [...context.thinkingSteps],
            subagentEvents: [...context.subagentEvents]
        });
    }
}
