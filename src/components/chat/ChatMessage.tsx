import { Message } from "./types";
import { ThinkingAccordion } from "./ThinkingAccordion";

interface ChatMessageProps {
    msg: Message;
}

function getActionClass(type: string) {
    const base = "px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border text-xs font-medium transition-colors ";
    if (type === "primary") {
        return base + "border-slate-300 dark:border-slate-600 hover:border-primary dark:hover:border-primary text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary";
    }
    return base + "border-slate-300 dark:border-slate-600 hover:border-red-400 dark:hover:border-red-400 text-slate-700 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400";
}

export function ChatMessage({ msg }: ChatMessageProps) {
    if (msg.role === "user") {
        return (
            <div className="flex items-end gap-3 justify-end group">
                <div className="flex flex-col gap-1 items-end max-w-[85%]">
                    {msg.timestamp && (
                        <div className="flex items-center gap-2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-slate-400 text-[11px]">{msg.timestamp}</span>
                        </div>
                    )}
                    <div className="p-3.5 rounded-2xl rounded-tr-sm bg-primary text-white shadow-sm">
                        <p className="text-sm font-normal leading-relaxed whitespace-pre-wrap break-words">
                            {msg.content}
                        </p>
                    </div>
                </div>
                <div className="size-8 rounded-full overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        U
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {/* AI Identity */}
            <div className="flex items-center gap-3 px-1">
                <div className="size-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20">
                    <span className="material-symbols-outlined text-white text-[18px]">smart_toy</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">Bookmark Assistant</span>
                    {msg.timestamp && (
                        <span className="text-[11px] text-slate-500">{msg.timestamp}</span>
                    )}
                </div>
            </div>

            {/* Thinking Process */}
            {msg.thinking && msg.thinking.length > 0 && (
                <ThinkingAccordion steps={msg.thinking} />
            )}

            {/* Final Response */}
            <div className="ml-11 max-w-[90%] mt-1">
                <div className="p-3.5 rounded-2xl rounded-tl-sm bg-slate-200 dark:bg-surface-dark text-slate-900 dark:text-slate-100 shadow-sm border border-transparent dark:border-slate-700">
                    <p className="text-sm font-normal leading-relaxed whitespace-pre-wrap break-words">
                        {msg.content}
                    </p>

                    {/* Action Chips */}
                    {msg.actions && msg.actions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {msg.actions.map((action, actionIndex) => (
                                <button
                                    key={actionIndex}
                                    className={getActionClass(action.type)}
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
