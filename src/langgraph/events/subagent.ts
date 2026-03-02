// ============================================================================
// 子代理事件类型常量定义
// ============================================================================

export const SUBAGENT_START = "subagent_start";
export const SUBAGENT_THINKING = "subagent_thinking";
export const SUBAGENT_UPDATE = "subagent_update";
export const SUBAGENT_CUSTOM = "subagent_custom";
export const SUBAGENT_END = "subagent_end";
export const SUBAGENT_ERROR = "subagent_error";

// ============================================================================
// 子代理事件类型定义
// ============================================================================

export interface SubagentStartEvent {
    type: typeof SUBAGENT_START;
    subagent_type: string;
    description: string;
    task_id: string;
}

export interface SubagentThinkingEvent {
    type: typeof SUBAGENT_THINKING;
    subagent_type: string;
    content: string;
}

export interface SubagentUpdateEvent {
    type: typeof SUBAGENT_UPDATE;
    subagent_type: string;
    data: any;
}

export interface SubagentCustomEvent {
    type: typeof SUBAGENT_CUSTOM;
    subagent_type: string;
    event: any;
}

export interface SubagentEndEvent {
    type: typeof SUBAGENT_END;
    subagent_type: string;
    result: string;
}

export interface SubagentErrorEvent {
    type: typeof SUBAGENT_ERROR;
    subagent_type: string;
    error: string;
}

// ============================================================================
// 子代理事件联合类型
// ============================================================================

export type SubagentEvent =
    | SubagentStartEvent
    | SubagentThinkingEvent
    | SubagentUpdateEvent
    | SubagentCustomEvent
    | SubagentEndEvent
    | SubagentErrorEvent;

// ============================================================================
// 类型守卫
// ============================================================================

export function isSubagentStartEvent(event: any): event is SubagentStartEvent {
    return event?.type === SUBAGENT_START;
}

export function isSubagentThinkingEvent(event: any): event is SubagentThinkingEvent {
    return event?.type === SUBAGENT_THINKING;
}

export function isSubagentUpdateEvent(event: any): event is SubagentUpdateEvent {
    return event?.type === SUBAGENT_UPDATE;
}

export function isSubagentCustomEvent(event: any): event is SubagentCustomEvent {
    return event?.type === SUBAGENT_CUSTOM;
}

export function isSubagentEndEvent(event: any): event is SubagentEndEvent {
    return event?.type === SUBAGENT_END;
}

export function isSubagentErrorEvent(event: any): event is SubagentErrorEvent {
    return event?.type === SUBAGENT_ERROR;
}
