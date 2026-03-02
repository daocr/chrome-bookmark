import type { EventHandler, EventHandlerContext } from "./types";
import { SubgraphOutputEvent, isSubgraphOutputEvent } from "@/langgraph/events";

/**
 * 处理子图输出事件
 * 处理子图返回的输出数据
 */
export class SubgraphOutputHandler implements EventHandler<SubgraphOutputEvent> {
    canHandle(event: any): event is SubgraphOutputEvent {
        return isSubgraphOutputEvent(event);
    }

    handle(event: SubgraphOutputEvent, _context: EventHandlerContext): void {
        // 子图输出事件，可以记录日志或显示调试信息
        console.log(`%c[SubgraphOutput] Namespace: %c${event.namespace.join("/")}`, 'color: #ec4899; font-weight: bold', 'color: #06b6d4', event.data);
    }
}
