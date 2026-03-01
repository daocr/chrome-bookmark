import { ThinkingStep } from "./types";

interface ThinkingAccordionProps {
    steps: ThinkingStep[];
}

function getStepBgClass(status: string) {
    if (status === "completed") return "bg-emerald-500/20";
    if (status === "in-progress") return "bg-primary/20";
    return "bg-slate-300/30 dark:bg-slate-600/30";
}

export function ThinkingAccordion({ steps }: ThinkingAccordionProps) {
    return (
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
                        {steps.map((step, stepIndex) => (
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
    );
}
