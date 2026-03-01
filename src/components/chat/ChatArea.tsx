import { Message } from "./types";
import { ChatMessage } from "./ChatMessage";
import { LoadingIndicator } from "./LoadingIndicator";

interface ChatAreaProps {
    messages: Message[];
    isLoading: boolean;
}

export function ChatArea({ messages, isLoading }: ChatAreaProps) {
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

                    {/* Loading Indicator */}
                    {isLoading && <LoadingIndicator />}
                </>
            )}

            {/* Placeholder for scrolling content */}
            <div className="h-4"></div>
        </div>
    );
}
