// ============================================================================
// 子图事件类型常量定义
// ============================================================================

export const SUBGRAPH_OUTPUT = "subgraph_output";
export const SUBGRAPH_NODE = "subgraph_node";

// ============================================================================
// 子图事件类型定义
// ============================================================================

export interface SubgraphOutputEvent {
    type: typeof SUBGRAPH_OUTPUT;
    namespace: string[];
    data: any;
}

export interface SubgraphNodeEvent {
    type: typeof SUBGRAPH_NODE;
    namespace: string[];
    node: string;
    data: any;
}

// ============================================================================
// 子图事件联合类型
// ============================================================================

export type SubgraphEvent = SubgraphOutputEvent | SubgraphNodeEvent;

// ============================================================================
// 类型守卫
// ============================================================================

export function isSubgraphOutputEvent(event: any): event is SubgraphOutputEvent {
    return event?.type === SUBGRAPH_OUTPUT;
}

export function isSubgraphNodeEvent(event: any): event is SubgraphNodeEvent {
    return event?.type === SUBGRAPH_NODE;
}
