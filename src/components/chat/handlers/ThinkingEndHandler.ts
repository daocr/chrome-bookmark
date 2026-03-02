import type { EventHandler, EventHandlerContext } from "./types";
import { ThinkingEndEvent, isThinkingEndEvent } from "@/langgraph/events";

/**
 * 处理思考结束事件
 * 完成当前活动的思考步骤
 */
export class ThinkingEndHandler implements EventHandler<ThinkingEndEvent> {
    canHandle(event: any): event is ThinkingEndEvent {
        return isThinkingEndEvent(event);
    }

    handle(event: ThinkingEndEvent, context: EventHandlerContext): void {
        console.log(`%c[ThinkingEnd] ${event.content?.substring(0, 50)}...`, 'color: #d946ef; font-weight: bold');
        // 完成当前活动的思考步骤
        if (context.currentThinkingIndex >= 0 && context.currentThinkingIndex < context.thinkingSteps.length) {
            context.thinkingSteps[context.currentThinkingIndex] = {
                text: event.content,
                status: "completed"
            };
        }
        context.setCurrentThinkingIndex(-1); // 重置
        context.updateCurrentMessage({ thinking: [...context.thinkingSteps] });
    }
}
