import type { Message } from "./types";
import type { SubagentEvent } from "./useStreamingChat";
import { ThinkingAccordion } from "./ThinkingAccordion";

interface ChatMessageProps {
    msg: Message | { role: "user" | "assistant"; content: string; timestamp?: string; thinking?: any[]; subagentEvents?: SubagentEvent[] };
}

function getActionClass(type: string) {
    const base = "px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border text-xs font-medium transition-colors ";
    if (type === "primary") {
        return base + "border-slate-300 dark:border-slate-600 hover:border-primary dark:hover:border-primary text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary";
    }
    return base + "border-slate-300 dark:border-slate-600 hover:border-red-400 dark:hover:border-red-400 text-slate-700 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400";
}

function getSubagentIcon(type: SubagentEvent["type"]) {
    switch (type) {
        case "start": return "play_circle";
        case "thinking": return "psychology";
        case "update": return "sync";
        case "end": return "check_circle";
        case "error": return "error";
        default: return "smart_toy";
    }
}

function getSubagentColor(type: SubagentEvent["type"]) {
    switch (type) {
        case "start": return "text-blue-500";
        case "thinking": return "text-purple-500 animate-pulse";
        case "update": return "text-yellow-500";
        case "end": return "text-emerald-500";
        case "error": return "text-red-500";
        default: return "text-slate-500";
    }
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

    const hasSubagentEvents = "subagentEvents" in msg && msg.subagentEvents && msg.subagentEvents.length > 0;

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

            {/* Subagent Events Timeline */}
            {hasSubagentEvents && (
                <div className="ml-11 max-w-[90%]">
                    <details className="group rounded-xl border border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/30 overflow-hidden transition-all duration-300">
                        <summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors select-none">
                            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                                <span className="material-symbols-outlined text-[18px]">account_tree</span>
                                <span className="text-xs font-semibold uppercase tracking-wider">Subagent Activity</span>
                                <span className="text-[10px] bg-purple-200 dark:bg-purple-800 px-2 py-0.5 rounded-full">
                                    {msg.subagentEvents!.length}
                                </span>
                            </div>
                            <span className="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform text-[18px]">
                                expand_more
                            </span>
                        </summary>
                        <div className="px-3 pb-3 pt-1 border-t border-purple-200 dark:border-purple-700/50">
                            <ul className="space-y-2 mt-2">
                                {msg.subagentEvents!.map((event, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-xs">
                                        <span className={`material-symbols-outlined text-[14px] shrink-0 ${getSubagentColor(event.type)}`}>
                                            {getSubagentIcon(event.type)}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                    {event.subagentType}
                                                    {event.callIndex && event.callIndex > 1 && (
                                                        <span className="ml-1 text-[10px] bg-purple-200 dark:bg-purple-800 px-1.5 py-0.5 rounded">
                                                            #{event.callIndex}
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="text-[10px] uppercase text-slate-500">
                                                    {event.type}
                                                </span>
                                            </div>
                                            {event.description && (
                                                <p className="text-slate-600 dark:text-slate-400 truncate">
                                                    {event.description}
                                                </p>
                                            )}
                                            {event.content && (
                                                <p className="text-slate-600 dark:text-slate-400 line-clamp-2">
                                                    {event.content}
                                                </p>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </details>
                </div>
            )}

            {/* Final Response */}
            <div className="ml-11 max-w-[90%] mt-1">
                <div className="p-3.5 rounded-2xl rounded-tl-sm bg-slate-200 dark:bg-surface-dark text-slate-900 dark:text-slate-100 shadow-sm border border-transparent dark:border-slate-700">
                    <p className="text-sm font-normal leading-relaxed whitespace-pre-wrap break-words">
                        {msg.content}
                    </p>

                    {/* Action Chips */}
                    {"actions" in msg && msg.actions && msg.actions.length > 0 && (
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
