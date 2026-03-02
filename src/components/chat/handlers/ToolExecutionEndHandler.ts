import type { EventHandler, EventHandlerContext } from "./types";
import { ToolExecutionEndEvent, isToolExecutionEndEvent } from "@/langgraph/events";

/**
 * 处理工具执行结束事件
 * 标记所有工具执行完成
 */
export class ToolExecutionEndHandler implements EventHandler<ToolExecutionEndEvent> {
    canHandle(event: any): event is ToolExecutionEndEvent {
        return isToolExecutionEndEvent(event);
    }

    handle(_event: ToolExecutionEndEvent, context: EventHandlerContext): void {
        console.log(`%c[ToolExecutionEnd] All tools completed`, 'color: #64748b; font-weight: bold');
        // 工具执行全部完成，可以添加一个完成提示
        context.updateCurrentMessage({
            thinking: [...context.thinkingSteps]
        });
    }
}
