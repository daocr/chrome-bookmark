import type { EventHandler, EventHandlerContext } from "./types";
import { ToolEndEvent, isToolEndEvent } from "@/langgraph/events";

/**
 * 处理工具执行结束事件
 * 标记工具执行完成
 */
export class ToolEndHandler implements EventHandler<ToolEndEvent> {
    canHandle(event: any): event is ToolEndEvent {
        return isToolEndEvent(event);
    }

    handle(event: ToolEndEvent, context: EventHandlerContext): void {
        console.log(`%c[ToolEnd] Tool: %c${event.name}`, 'color: #14b8a6; font-weight: bold', 'color: #06b6d4');
        const endIndex = context.thinkingSteps.findIndex(s =>
            s.text.includes(`等待调用: ${event.name}`) ||
            s.text.includes(`执行中: ${event.name}`) ||
            s.text.includes(`执行工具: ${event.name}`)
        );
        if (endIndex >= 0) {
            context.thinkingSteps[endIndex] = { text: `完成: ${event.name}`, status: "completed" };
        }
        context.updateCurrentMessage({ thinking: [...context.thinkingSteps] });
    }
}
