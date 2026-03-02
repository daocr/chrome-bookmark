import type { EventHandler, EventHandlerContext } from "./types";
import { ToolPlanningEvent, isToolPlanningEvent } from "@/langgraph/events";

/**
 * 处理工具计划事件
 * 显示计划使用的工具列表
 */
export class ToolPlanningHandler implements EventHandler<ToolPlanningEvent> {
    canHandle(event: any): event is ToolPlanningEvent {
        return isToolPlanningEvent(event);
    }

    handle(event: ToolPlanningEvent, context: EventHandlerContext): void {
        console.log(`%c[ToolPlanning] %c${event.tools.length}%c tools: ${event.tools.map(t => t.name).join(", ")}`, 'color: #f43f5e; font-weight: bold', 'color: #06b6d4', 'color: #f43f5e');
        context.thinkingSteps.push({ text: `计划使用 ${event.tools.length} 个工具`, status: "completed" });
        for (const tool of event.tools) {
            context.thinkingSteps.push({ text: `等待调用: ${tool.name}`, status: "pending" });
        }
        context.updateCurrentMessage({ thinking: [...context.thinkingSteps] });
    }
}
