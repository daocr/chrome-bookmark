import type { EventHandler, EventHandlerContext } from "./types";
import { ThinkingContentEvent, isThinkingContentEvent } from "@/langgraph/events";

/**
 * 处理思考内容事件
 * 更新当前活动的思考步骤
 */
export class ThinkingContentHandler implements EventHandler<ThinkingContentEvent> {
    canHandle(event: any): event is ThinkingContentEvent {
        return isThinkingContentEvent(event);
    }

    handle(event: ThinkingContentEvent, context: EventHandlerContext): void {
        console.log(`%c[ThinkingContent] ${event.content?.substring(0, 50)}...`, 'color: #a855f7; font-weight: bold');
        // 更新当前活动的思考步骤
        if (context.currentThinkingIndex >= 0 && context.currentThinkingIndex < context.thinkingSteps.length) {
            context.thinkingSteps[context.currentThinkingIndex] = {
                text: event.content,
                status: "in-progress"
            };
        } else {
            // 如果没有活动的思考步骤，创建新的（防御性编程）
            context.setCurrentThinkingIndex(context.thinkingSteps.length);
            context.thinkingSteps.push({ text: event.content, status: "in-progress" });
        }
        context.updateCurrentMessage({ thinking: [...context.thinkingSteps] });
    }
}
