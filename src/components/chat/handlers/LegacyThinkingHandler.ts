import type { EventHandler, EventHandlerContext } from "./types";
import { LegacyThinkingEvent, isLegacyThinkingEvent } from "@/langgraph/events";

/**
 * 处理旧版思考事件
 * 兼容旧的思考事件格式
 */
export class LegacyThinkingHandler implements EventHandler<LegacyThinkingEvent> {
    canHandle(event: any): event is LegacyThinkingEvent {
        return isLegacyThinkingEvent(event);
    }

    handle(event: LegacyThinkingEvent, context: EventHandlerContext): void {
        console.log(`%c[LegacyThinking] Content: ${event.content?.substring(0, 50)}...`, 'color: #7c3aed; font-weight: bold');
        // 旧版思考事件，创建新的思考步骤
        context.setCurrentThinkingIndex(context.thinkingSteps.length);
        context.thinkingSteps.push({ text: event.content, status: "in-progress" });
        context.updateCurrentMessage({ thinking: [...context.thinkingSteps] });
    }
}
