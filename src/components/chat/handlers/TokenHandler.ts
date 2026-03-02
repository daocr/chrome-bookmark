import type {EventHandler, EventHandlerContext} from "./types";
import {TokenEvent, isTokenEvent} from "@/langgraph/events";

/**
 * 处理Token事件
 * 实时显示token流（打字机效果）
 */
export class TokenHandler implements EventHandler<TokenEvent> {
    canHandle(event: any): event is TokenEvent {
        return isTokenEvent(event);
    }

    handle(event: TokenEvent, context: EventHandlerContext): void {
        // Token events are very frequent, only log in debug mode
        console.log(`%c[Token] ${event.content}`, 'color: #94a3b8');
        // 实时显示 token 流（使用本地变量避免异步 state 更新问题）
        const newContent = context.accumulatedContent + event.content;
        context.setAccumulatedContent(newContent);
        context.updateCurrentMessage({content: newContent});
    }
}
