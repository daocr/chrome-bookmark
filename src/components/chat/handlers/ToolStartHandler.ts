import type { EventHandler, EventHandlerContext } from "./types";
import { ToolStartEvent, isToolStartEvent } from "@/langgraph/events";

/**
 * 处理工具开始执行事件
 * 更新工具状态为执行中
 */
export class ToolStartHandler implements EventHandler<ToolStartEvent> {
    canHandle(event: any): event is ToolStartEvent {
        return isToolStartEvent(event);
    }

    handle(event: ToolStartEvent, context: EventHandlerContext): void {
        console.log(`%c[ToolStart] Tool: %c${event.name}`, 'color: #0d9488; font-weight: bold', 'color: #06b6d4');
        // 更新对应的工具状态
        const toolIndex = context.thinkingSteps.findIndex(s =>
            s.text.includes(`等待调用: ${event.name}`) ||
            s.text.includes(`执行工具: ${event.name}`)
        );
        if (toolIndex >= 0) {
            context.thinkingSteps[toolIndex] = { text: `执行中: ${event.name}`, status: "in-progress" };
        }
        context.updateCurrentMessage({ thinking: [...context.thinkingSteps] });
    }
}
