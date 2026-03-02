// ============================================================================
// 思考事件类型常量定义
// ============================================================================

export const THINKING_START = "thinking_start";
export const THINKING_CONTENT = "thinking_content";
export const THINKING_END = "thinking_end";
export const TOOL_PLANNING = "tool_planning";

// ============================================================================
// 思考事件类型定义
// ============================================================================

export interface ThinkingStartEvent {
    type: typeof THINKING_START;
    content: string;
}

export interface ThinkingContentEvent {
    type: typeof THINKING_CONTENT;
    content: string;
}

export interface ThinkingEndEvent {
    type: typeof THINKING_END;
    content: string;
}

export interface ToolPlanningEvent {
    type: typeof TOOL_PLANNING;
    tools: Array<{ name: string; args: any }>;
}

// ============================================================================
// 思考事件联合类型
// ============================================================================

export type ThinkingEvent = ThinkingStartEvent | ThinkingContentEvent | ThinkingEndEvent | ToolPlanningEvent;

// ============================================================================
// 类型守卫
// ============================================================================

export function isThinkingStartEvent(event: any): event is ThinkingStartEvent {
    return event?.type === THINKING_START;
}

export function isThinkingContentEvent(event: any): event is ThinkingContentEvent {
    return event?.type === THINKING_CONTENT;
}

export function isThinkingEndEvent(event: any): event is ThinkingEndEvent {
    return event?.type === THINKING_END;
}

export function isToolPlanningEvent(event: any): event is ToolPlanningEvent {
    return event?.type === TOOL_PLANNING;
}
