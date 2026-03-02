import type { Message } from "./types";
import type { StreamingMessage } from "./useStreamingChat";
import { ChatMessage } from "./ChatMessage";
import { LoadingIndicator } from "./LoadingIndicator";

interface ChatAreaProps {
    messages: (Message | StreamingMessage)[];
    isLoading: boolean;
}

export function ChatArea({ messages, isLoading }: ChatAreaProps) {
    // 判断是否需要显示 LoadingIndicator
    // 只有当最后一条消息不是 assistant 时才显示（避免重复）
    const lastMessage = messages[messages.length - 1];
    const shouldShowLoading = isLoading && (!lastMessage || lastMessage.role !== "assistant");

    return (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 no-scrollbar">
            {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
                    <p>Start a conversation about your bookmarks...</p>
                </div>
            ) : (
                <>
                    {/* Date Divider */}
                    <div className="flex justify-center">
                        <span className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-surface-dark px-3 py-1 rounded-full">
                            Today
                        </span>
                    </div>

                    {/* Messages */}
                    {messages.map((msg, index) => (
                        <div key={index}>
                            <ChatMessage msg={msg} />
                        </div>
                    ))}

                    {/* Loading Indicator - 只在没有 assistant 消息时显示 */}
                    {shouldShowLoading && <LoadingIndicator />}
                </>
            )}

            {/* Placeholder for scrolling content */}
            <div className="h-4"></div>
        </div>
    );
}
