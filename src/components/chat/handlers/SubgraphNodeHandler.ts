import type { EventHandler, EventHandlerContext } from "./types";
import { SubgraphNodeEvent, isSubgraphNodeEvent } from "@/langgraph/events";

/**
 * 处理子图节点事件
 * 处理子图中节点的数据
 */
export class SubgraphNodeHandler implements EventHandler<SubgraphNodeEvent> {
    canHandle(event: any): event is SubgraphNodeEvent {
        return isSubgraphNodeEvent(event);
    }

    handle(event: SubgraphNodeEvent, _context: EventHandlerContext): void {
        // 子图节点事件，可以记录日志或显示调试信息
        console.log(`%c[SubgraphNode] Namespace: %c${event.namespace.join("/")}%c, Node: %c${event.node}`, 'color: #f59e0b; font-weight: bold', 'color: #06b6d4', 'color: #f59e0b', 'color: #06b6d4', event.data);
    }
}
