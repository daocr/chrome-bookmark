import type { EventHandler, EventHandlerContext } from "./types";
import { SubagentCustomEvent, isSubagentCustomEvent } from "@/langgraph/events";

/**
 * 处理子代理自定义事件
 * 处理子代理发送的自定义事件
 */
export class SubagentCustomHandler implements EventHandler<SubagentCustomEvent> {
    canHandle(event: any): event is SubagentCustomEvent {
        return isSubagentCustomEvent(event);
    }

    handle(event: SubagentCustomEvent, context: EventHandlerContext): void {
        console.log(`%c[SubagentCustom] Type: %c${event.subagent_type}%c, Event:`, 'color: #eab308; font-weight: bold', 'color: #06b6d4', 'color: #eab308', event.event);

        // 专门打印 tool_start 日志
        if (event.event && event.event.status === "tool_start") {
            const { toolName, args } = event.event;
            console.log(`%c[Tool Start]%c ${event.subagent_type} 正在执行工具: %c${toolName}`, 'color: #8b5cf6; font-weight: bold', 'color: inherit', 'color: #10b981; font-weight: bold', '参数:', args);
        } else if (event.event && event.event.status === "tool_success") {
            console.log(`%c[Tool Success]%c ${event.subagent_type} 工具 %c${event.event.toolName}%c 执行完毕`, 'color: #10b981; font-weight: bold', 'color: inherit', 'color: #10b981; font-weight: bold', 'color: inherit');
        } else if (event.event && event.event.status === "tool_error") {
            console.error(`[Tool Error] ${event.subagent_type} 工具 ${event.event.toolName} 执行失败:`, event.event.error);
        }

        // 子代理自定义事件，可以记录到 subagentEvents 中
        context.subagentEvents.push({
            type: "update",
            subagentType: event.subagent_type,
            data: event.event,
        });
        context.updateCurrentMessage({
            subagentEvents: [...context.subagentEvents]
        });
    }
}
