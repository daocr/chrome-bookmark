import type { EventHandler, EventHandlerContext } from "./types";
import { ThinkingStartEvent, isThinkingStartEvent } from "@/langgraph/events";

/**
 * 处理思考开始事件
 * 创建新的思考步骤
 */
export class ThinkingStartHandler implements EventHandler<ThinkingStartEvent> {
    canHandle(event: any): event is ThinkingStartEvent {
        return isThinkingStartEvent(event);
    }

    handle(event: ThinkingStartEvent, context: EventHandlerContext): void {
        console.log(`%c[ThinkingStart] ${event.content?.substring(0, 50)}...`, 'color: #c026d3; font-weight: bold');
        // 主 agent 开始新的思考，创建新步骤
        context.setCurrentThinkingIndex(context.thinkingSteps.length);
        context.thinkingSteps.push({ text: event.content, status: "in-progress" });
        context.updateCurrentMessage({ thinking: [...context.thinkingSteps] });
    }
}
