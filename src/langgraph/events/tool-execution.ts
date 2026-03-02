// ============================================================================
// 工具执行事件类型常量定义
// ============================================================================

export const TOOL_EXECUTION_START = "tool_execution_start";
export const TOOL_START = "tool_start";
export const TOOL_END = "tool_end";
export const TOOL_ERROR = "tool_error";
export const TOOL_EXECUTION_END = "tool_execution_end";

// ============================================================================
// 工具执行事件类型定义
// ============================================================================

export interface ToolExecutionStartEvent {
    type: typeof TOOL_EXECUTION_START;
    count: number;
    tools: Array<{ name: string; args: any }>;
}

export interface ToolStartEvent {
    type: typeof TOOL_START;
    name: string;
    args: any;
    index: number;
    total: number;
}

export interface ToolEndEvent {
    type: typeof TOOL_END;
    name: string;
    output: any;
    index: number;
    total: number;
}

export interface ToolErrorEvent {
    type: typeof TOOL_ERROR;
    name: string;
    error: string;
    index: number;
    total: number;
}

export interface ToolExecutionEndEvent {
    type: typeof TOOL_EXECUTION_END;
    count: number;
}

// ============================================================================
// 工具执行事件联合类型
// ============================================================================

export type ToolExecutionEvent =
    | ToolExecutionStartEvent
    | ToolStartEvent
    | ToolEndEvent
    | ToolErrorEvent
    | ToolExecutionEndEvent;

// ============================================================================
// 类型守卫
// ============================================================================

export function isToolExecutionStartEvent(event: any): event is ToolExecutionStartEvent {
    return event?.type === TOOL_EXECUTION_START;
}

export function isToolStartEvent(event: any): event is ToolStartEvent {
    return event?.type === TOOL_START;
}

export function isToolEndEvent(event: any): event is ToolEndEvent {
    return event?.type === TOOL_END;
}

export function isToolErrorEvent(event: any): event is ToolErrorEvent {
    return event?.type === TOOL_ERROR;
}

export function isToolExecutionEndEvent(event: any): event is ToolExecutionEndEvent {
    return event?.type === TOOL_EXECUTION_END;
}
