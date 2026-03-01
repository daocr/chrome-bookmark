interface ChatHeaderProps {
    onOpenSettings: () => void;
}

export function ChatHeader({ onOpenSettings }: ChatHeaderProps) {
    return (
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
                    onClick={onOpenSettings}
                >
                    <span className="material-symbols-outlined text-[20px]">settings</span>
                </button>
            </div>
        </header>
    );
}
