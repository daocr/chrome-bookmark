import type { EventHandler, EventHandlerContext } from "./types";
import { SubagentEndEvent, isSubagentEndEvent } from "@/langgraph/events";

/**
 * 处理子代理结束事件
 * 标记子代理执行完成
 */
export class SubagentEndHandler implements EventHandler<SubagentEndEvent> {
    canHandle(event: any): event is SubagentEndEvent {
        return isSubagentEndEvent(event);
    }

    handle(event: SubagentEndEvent, context: EventHandlerContext): void {
        console.log(`%c[SubagentEnd] Type: %c${event.subagent_type}%c, Result: ${event.result?.substring(0, 50)}...`, 'color: #22c55e; font-weight: bold', 'color: #06b6d4', 'color: #22c55e');
        // 标记子代理完成
        const endCallIndex = context.subagentCallCounts[event.subagent_type];

        // 从后往前查找最后一个匹配的步骤
        let stepIndex = -1;
        for (let i = context.thinkingSteps.length - 1; i >= 0; i--) {
            if (context.thinkingSteps[i].text.startsWith(`[${event.subagent_type}`)) {
                stepIndex = i;
                break;
            }
        }

        if (stepIndex >= 0) {
            context.thinkingSteps[stepIndex] = {
                text: endCallIndex === 1
                    ? `[${event.subagent_type}] 完成`
                    : `[${event.subagent_type} #${endCallIndex}] 完成`,
                status: "completed"
            };
        }

        context.subagentEvents.push({
            type: "end",
            subagentType: event.subagent_type,
            content: event.result,
            callIndex: endCallIndex,
        });

        // 重置当前活动调用
        context.setCurrentSubagentCallId(null);

        context.updateCurrentMessage({
            thinking: [...context.thinkingSteps],
            subagentEvents: [...context.subagentEvents]
        });
    }
}
