export function LoadingIndicator() {
    return (
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
    );
}
