import type { EventHandler, EventHandlerContext } from "./types";
import { SubagentThinkingEvent, isSubagentThinkingEvent } from "@/langgraph/events";

/**
 * 处理子代理思考事件
 * 更新子代理的思考内容
 */
export class SubagentThinkingHandler implements EventHandler<SubagentThinkingEvent> {
    canHandle(event: any): event is SubagentThinkingEvent {
        return isSubagentThinkingEvent(event);
    }

    handle(event: SubagentThinkingEvent, context: EventHandlerContext): void {
        console.log(`%c[SubagentThinking] Type: %c${event.subagent_type}%c, Content: ${event.content?.substring(0, 50)}...`, 'color: #f97316; font-weight: bold', 'color: #06b6d4', 'color: #f97316');
        // 使用当前活动的子代理调用 ID 来查找和更新步骤
        if (context.currentSubagentCallId) {
            // 从后往前查找最后一个匹配该子代理类型的步骤
            let stepIndex = -1;
            for (let i = context.thinkingSteps.length - 1; i >= 0; i--) {
                if (context.thinkingSteps[i].text.startsWith(`[${event.subagent_type}`)) {
                    stepIndex = i;
                    break;
                }
            }

            if (stepIndex >= 0) {
                // 更新现有步骤，保留调用编号和前缀
                const currentText = context.thinkingSteps[stepIndex].text;
                const parts = currentText.split(' - ');
                const prefix = parts[0]; // 保留 "[explore #2]" 部分
                context.thinkingSteps[stepIndex] = {
                    text: parts.length > 1
                        ? `${prefix} - ${event.content}`
                        : `${prefix} - ${event.content}`,
                    status: "in-progress"
                };
            }
        }
        context.updateCurrentMessage({ thinking: [...context.thinkingSteps] });
    }
}
