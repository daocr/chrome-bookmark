import { FormEvent } from "react";

interface ChatInputProps {
    textareaHeight: number;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    isLoading: boolean;
    input: string;
    onInputChange: (value: string) => void;
    onSend: (e: FormEvent) => void;
    onDragStart: (e: React.MouseEvent) => void;
    onHeightChange: () => void;
    maxHeight: number;
    showExamplePrompts: boolean;
}

export function ChatInput({
    textareaHeight,
    textareaRef,
    isLoading,
    input,
    onInputChange,
    onSend,
    onDragStart,
    onHeightChange,
    maxHeight,
    showExamplePrompts,
}: ChatInputProps) {
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        onInputChange(value);
        onHeightChange();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (input.trim() && !isLoading) {
                onSend(e);
            }
        }
    };

    return (
        <div className="p-4 bg-background-light dark:bg-background-dark border-t border-slate-200 dark:border-slate-800 shrink-0">
            <form onSubmit={onSend} className="relative flex items-center w-full">
                <div className="flex w-full flex-col rounded-xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-slate-700 shadow-sm transition-all relative">
                    {/* Drag handle */}
                    <div
                        className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors group z-10"
                        onMouseDown={onDragStart}
                        title="拖动调整高度"
                    >
                        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full group-hover:bg-slate-400 dark:group-hover:bg-slate-500 transition-colors"></div>
                    </div>
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a command or ask a question..."
                        disabled={isLoading}
                        className="w-full bg-transparent border-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm p-3 resize-none focus:ring-0 focus:outline-none disabled:opacity-50"
                        style={{ height: `${textareaHeight}px`, minHeight: `${textareaHeight}px`, maxHeight: `${maxHeight}px` }}
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
            {showExamplePrompts && (
                <div className="mt-4 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => onInputChange("帮我搜索包含 'github' 的书签")}
                        className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:border-primary dark:hover:border-primary text-xs font-medium transition-colors text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary"
                    >
                        Search GitHub
                    </button>
                    <button
                        type="button"
                        onClick={() => onInputChange("Show me my recent bookmarks")}
                        className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:border-primary dark:hover:border-primary text-xs font-medium transition-colors text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary"
                    >
                        Recent Bookmarks
                    </button>
                    <button
                        type="button"
                        onClick={() => onInputChange("Get my entire bookmark tree")}
                        className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:border-primary dark:hover:border-primary text-xs font-medium transition-colors text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary"
                    >
                        Bookmark Tree
                    </button>
                </div>
            )}
        </div>
    );
}
