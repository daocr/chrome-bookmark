// ============================================================================
// 流式输出事件类型 - 统一导出
// ============================================================================

// 导出所有事件类型和常量
export * from "./thinking";
export * from "./tool-execution";
export * from "./subagent";
export * from "./subgraph";
export * from "./common";

// ============================================================================
// 完整的 StreamEvent 联合类型
// ============================================================================

import type {
    ThinkingEvent,
} from "./thinking";
import type {
    ToolExecutionEvent,
} from "./tool-execution";
import type {
    SubagentEvent,
} from "./subagent";
import type {
    SubgraphEvent,
} from "./subgraph";
import type {
    CommonEvent,
} from "./common";

/**
 * 完整的 StreamEvent 联合类型
 * 包含所有类型的事件：思考、工具执行、子代理、子图、通用事件
 */
export type StreamEvent =
    | ThinkingEvent
    | ToolExecutionEvent
    | SubagentEvent
    | SubgraphEvent
    | CommonEvent;
