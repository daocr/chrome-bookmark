import { useState, useRef, useEffect } from "react";
import { SettingsDialog } from "@/components/SettingsDialog";
import { invokeAgent, printResult } from "@/langgraph/agents/agent";
import { LLMFactory } from "@/langgraph/agents/llm-factory";

interface ThinkingStep {
    text: string;
    status: "completed" | "in-progress" | "pending";
}

interface Message {
    role: "user" | "assistant";
    content: string;
    thinking?: ThinkingStep[];
    actions?: Array<{ label: string; type: "primary" | "secondary" }>;
    timestamp?: string;
}

export function ChatPage() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [textareaHeight, setTextareaHeight] = useState(() => window.innerHeight * 0.1); // 默认高度为页面高度的10%
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dragStartY = useRef(0);
    const dragStartHeight = useRef(0);

    console.log("[ChatPage] Component rendered");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("[ChatPage] Form submitted with input:", input);

        if (!input.trim()) return;

        const timestamp = new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });

        // Add user message
        const userMessage: Message = {
            role: "user",
            content: input,
            timestamp,
        };
        setMessages((prev) => [...prev, userMessage]);

        const userInput = input;
        setInput("");
        setIsLoading(true);

        try {
            // Call agent
            const result = await invokeAgent(userInput);

            // Print result to console
            console.log("=== Agent Result ===");
            printResult(result);
            console.log("====================");

            // Extract AI response content
            const lastMessage = result.messages[result.messages.length - 1] as any;
            const assistantContent = lastMessage?.content || lastMessage?.text || JSON.stringify(lastMessage);

            // Add assistant message
            const assistantMessage: Message = {
                role: "assistant",
                content: assistantContent,
                timestamp: new Date().toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                }),
                thinking: [
                    { text: "Analyzing request intent", status: "completed" },
                    { text: "Identifying target bookmarks", status: "completed" },
                    { text: "Processing your request", status: "in-progress" },
                ],
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error("Agent invocation error:", error);

            const errorMessage: Message = {
                role: "assistant",
                content: `Error: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                }),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const getStepBgClass = (status: string) => {
        if (status === "completed") return "bg-emerald-500/20";
        if (status === "in-progress") return "bg-primary/20";
        return "bg-slate-300/30 dark:bg-slate-600/30";
    };

    const getActionClass = (type: string) => {
        const base = "px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border text-xs font-medium transition-colors ";
        if (type === "primary") {
            return base + "border-slate-300 dark:border-slate-600 hover:border-primary dark:hover:border-primary text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary";
        }
        return base + "border-slate-300 dark:border-slate-600 hover:border-red-400 dark:hover:border-red-400 text-slate-700 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400";
    };

    // 自适应高度
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = `${textareaHeight}px`;
        }
    }, [textareaHeight]);

    // 初始化时设置高度
    useEffect(() => {
        const initialHeight = window.innerHeight * 0.1;
        setTextareaHeight(initialHeight);
    }, []);

    // 输入时自适应高度
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setInput(value);

        if (textareaRef.current) {
            // 重置高度以获取正确的 scrollHeight
            textareaRef.current.style.height = `${textareaHeight}px`;
            const scrollHeight = textareaRef.current.scrollHeight;
            // 最小高度为页面高度的10%，最大高度为页面高度的30%
            const minHeight = window.innerHeight * 0.1;
            const maxHeight = window.innerHeight * 0.3;
            const newHeight = Math.max(minHeight, Math.min(maxHeight, scrollHeight));
            // 只有当内容高度大于当前手动设置的高度时才自动调整
            if (scrollHeight > textareaHeight) {
                setTextareaHeight(newHeight);
            }
        }
    };

    // 拖动开始
    const handleDragStart = (e: React.MouseEvent) => {
        e.preventDefault();
        dragStartY.current = e.clientY;
        dragStartHeight.current = textareaHeight;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaY = dragStartY.current - e.clientY;
            const minHeight = window.innerHeight * 0.1;
            const maxHeight = window.innerHeight * 0.3;
            const newHeight = Math.max(minHeight, Math.min(maxHeight, dragStartHeight.current + deltaY));
            setTextareaHeight(newHeight);
        };

        const handleMouseUp = () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    // 发送后重置高度
    const handleSend = (e: React.FormEvent) => {
        handleSubmit(e);
        setTextareaHeight(window.innerHeight * 0.1); // 重置为页面高度的10%
    };

    return (
        <div className="flex justify-end h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
            {/* Main Sidebar Container */}
            <div className="relative flex h-full w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark border-l border-slate-200 dark:border-slate-800 shadow-xl">
                {/* Header */}
                <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-slate-800 px-4 py-3 shrink-0 bg-background-light dark:bg-background-dark z-10">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-8 rounded-lg bg-primary/20 text-primary">
                            <span className="material-symbols-outlined text-[20px]">bookmarks</span>
                        </div>
                        <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight">
                            AI Bookmarks
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="flex items-center justify-center size-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
                            <span className="material-symbols-outlined text-[20px]">history</span>
                        </button>
                        <button
                            className="flex items-center justify-center size-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                            onClick={() => setSettingsOpen(true)}
                        >
                            <span className="material-symbols-outlined text-[20px]">settings</span>
                        </button>
                    </div>
                </header>

                {/* Chat Area */}
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
                                    {msg.role === "user" ? (
                                        // User Message
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
                                    ) : (
                                        // AI Response Group
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

                                            {/* Thinking Process (Accordion) */}
                                            {msg.thinking && msg.thinking.length > 0 && (
                                                <div className="ml-11 max-w-[90%]">
                                                    <details className="group rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-surface-dark overflow-hidden transition-all duration-300">
                                                        <summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors select-none">
                                                            <div className="flex items-center gap-2 text-primary">
                                                                <span className="material-symbols-outlined text-[18px]">psychology</span>
                                                                <span className="text-xs font-semibold uppercase tracking-wider">Thinking Process</span>
                                                            </div>
                                                            <span className="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform text-[18px]">
                                                                expand_more
                                                            </span>
                                                        </summary>
                                                        <div className="px-3 pb-3 pt-1 border-t border-slate-200 dark:border-slate-700/50">
                                                            <ul className="space-y-3 mt-2">
                                                                {msg.thinking.map((step, stepIndex) => (
                                                                    <li key={stepIndex} className={`flex gap-2.5 items-start ${step.status === "in-progress" ? "animate-pulse" : ""}`}>
                                                                        <div className={`mt-0.5 size-4 rounded-full flex items-center justify-center shrink-0 ${getStepBgClass(step.status)}`}>
                                                                            {step.status === "completed" ? (
                                                                                <span className="material-symbols-outlined text-emerald-500 text-[10px]">check</span>
                                                                            ) : step.status === "in-progress" ? (
                                                                                <div className="size-1.5 rounded-full bg-primary"></div>
                                                                            ) : (
                                                                                <div className="size-1.5 rounded-full bg-slate-400 dark:bg-slate-500"></div>
                                                                            )}
                                                                        </div>
                                                                        <span className="text-xs text-slate-600 dark:text-slate-300 leading-tight">{step.text}</span>
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
                                    )}
                                </div>
                            ))}

                            {/* Loading Indicator */}
                            {isLoading && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-3 px-1">
                                        <div className="size-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20">
                                            <span className="material-symbols-outlined text-white text-[18px]">smart_toy</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">Bookmark Assistant</span>
                                            <span className="text-[11px] text-slate-500 animate-pulse">Thinking...</span>
                                        </div>
                                    </div>
                                    <div className="ml-11 max-w-[90%]">
                                        <div className="p-3.5 rounded-2xl rounded-tl-sm bg-slate-200 dark:bg-surface-dark text-slate-900 dark:text-slate-100 shadow-sm border border-transparent dark:border-slate-700">
                                            <div className="flex gap-1">
                                                <span className="size-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                                                <span className="size-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                                                <span className="size-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Placeholder for scrolling content */}
                    <div className="h-4"></div>
                </div>

                {/* Input Area */}
                <div className="p-4 bg-background-light dark:bg-background-dark border-t border-slate-200 dark:border-slate-800 shrink-0">
                    <form onSubmit={handleSend} className="relative flex items-center w-full">
                        <div className="flex w-full flex-col rounded-xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-slate-700 shadow-sm transition-all relative">
                            {/* 拖动手柄 */}
                            <div
                                className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors group z-10"
                                onMouseDown={handleDragStart}
                                title="拖动调整高度"
                            >
                                <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full group-hover:bg-slate-400 dark:group-hover:bg-slate-500 transition-colors"></div>
                            </div>
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={handleInputChange}
                                placeholder="Type a command or ask a question..."
                                disabled={isLoading}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        if (input.trim() && !isLoading) {
                                            handleSend(e);
                                        }
                                    }
                                }}
                                className="w-full bg-transparent border-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm p-3 resize-none focus:ring-0 focus:outline-none disabled:opacity-50"
                                style={{ height: `${textareaHeight}px`, minHeight: `${textareaHeight}px`, maxHeight: `${window.innerHeight * 0.3}px` }}
                            />
                            <div className="flex justify-between items-center px-2 pb-2">
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 transition-colors"
                                        title="Attach context"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">add_circle</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 transition-colors"
                                        title="Voice input"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">mic</span>
                                    </button>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading || !input.trim()}
                                    className="p-2 rounded-lg bg-primary hover:bg-blue-600 text-white shadow-md shadow-blue-500/20 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                                </button>
                            </div>
                        </div>
                    </form>
                    <p className="text-[10px] text-center text-slate-400 dark:text-slate-600 mt-2">
                        AI can make mistakes. Check important info.
                    </p>

                    {/* Example Prompts */}
                    {messages.length === 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setInput("帮我搜索包含 'github' 的书签")}
                                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:border-primary dark:hover:border-primary text-xs font-medium transition-colors text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary"
                            >
                                Search GitHub
                            </button>
                            <button
                                type="button"
                                onClick={() => setInput("Show me my recent bookmarks")}
                                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:border-primary dark:hover:border-primary text-xs font-medium transition-colors text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary"
                            >
                                Recent Bookmarks
                            </button>
                            <button
                                type="button"
                                onClick={() => setInput("Get my entire bookmark tree")}
                                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:border-primary dark:hover:border-primary text-xs font-medium transition-colors text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary"
                            >
                                Bookmark Tree
                            </button>
                        </div>
                    )}
                </div>

                {/* Settings Dialog */}
                <SettingsDialog
                    open={settingsOpen}
                    onClose={() => setSettingsOpen(false)}
                    onSave={async (config) => {
                        LLMFactory.reset();
                        await LLMFactory.createLLM(config);
                    }}
                />
            </div>
        </div>
    );
}
