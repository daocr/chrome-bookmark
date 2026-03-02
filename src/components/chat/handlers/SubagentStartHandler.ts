import type { EventHandler, EventHandlerContext } from "./types";
import { SubagentStartEvent, isSubagentStartEvent } from "@/langgraph/events";

/**
 * 处理子代理开始事件
 * 创建子代理执行步骤并跟踪调用次数
 */
export class SubagentStartHandler implements EventHandler<SubagentStartEvent> {
    canHandle(event: any): event is SubagentStartEvent {
        return isSubagentStartEvent(event);
    }

    handle(event: SubagentStartEvent, context: EventHandlerContext): void {
        console.log(`%c[SubagentStart] Type: %c${event.subagent_type}%c, Description: ${event.description?.substring(0, 50)}...`, 'color: #3b82f6; font-weight: bold', 'color: #06b6d4', 'color: #3b82f6');
        // 增加该类型子代理的调用计数
        context.subagentCallCounts[event.subagent_type] =
            (context.subagentCallCounts[event.subagent_type] || 0) + 1;
        const callIndex = context.subagentCallCounts[event.subagent_type];
        const callId = `${event.subagent_type}_${callIndex}`;

        // 创建带调用编号的步骤
        const stepText = callIndex === 1
            ? `[${event.subagent_type}] ${event.description}`
            : `[${event.subagent_type} #${callIndex}] ${event.description}`;

        context.thinkingSteps.push({
            text: stepText,
            status: "in-progress"
        });
        context.setCurrentSubagentCallId(callId);

        context.subagentEvents.push({
            type: "start",
            subagentType: event.subagent_type,
            description: event.description,
            callIndex,
        });
        context.updateCurrentMessage({
            thinking: [...context.thinkingSteps],
            subagentEvents: [...context.subagentEvents]
        });
    }
}
