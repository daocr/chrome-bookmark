// ============================================================================
// 通用事件类型常量定义
// ============================================================================

export const TOKEN = "token";
export const DONE = "done";
export const ERROR = "error";
export const THINKING = "thinking";
export const TOOL_CALL = "tool_call";
export const TOOL_RESULT = "tool_result";

// ============================================================================
// 通用事件类型定义
// ============================================================================

export interface TokenEvent {
    type: typeof TOKEN;
    content: string;
    metadata?: any;
}

export interface DoneEvent {
    type: typeof DONE;
    message: string;
}

export interface ErrorEvent {
    type: typeof ERROR;
    error: string;
}

export interface LegacyThinkingEvent {
    type: typeof THINKING;
    content: string;
}

export interface ToolCallEvent {
    type: typeof TOOL_CALL;
    tool: string;
    input: any;
}

export interface ToolResultEvent {
    type: typeof TOOL_RESULT;
    tool: string;
    output: any;
}

// ============================================================================
// 通用事件联合类型
// ============================================================================

export type CommonEvent =
    | TokenEvent
    | DoneEvent
    | ErrorEvent
    | LegacyThinkingEvent
    | ToolCallEvent
    | ToolResultEvent;

// ============================================================================
// 类型守卫
// ============================================================================

export function isTokenEvent(event: any): event is TokenEvent {
    return event?.type === TOKEN;
}

export function isDoneEvent(event: any): event is DoneEvent {
    return event?.type === DONE;
}

export function isErrorEvent(event: any): event is ErrorEvent {
    return event?.type === ERROR;
}

export function isLegacyThinkingEvent(event: any): event is LegacyThinkingEvent {
    return event?.type === THINKING;
}

export function isToolCallEvent(event: any): event is ToolCallEvent {
    return event?.type === TOOL_CALL;
}

export function isToolResultEvent(event: any): event is ToolResultEvent {
    return event?.type === TOOL_RESULT;
}
