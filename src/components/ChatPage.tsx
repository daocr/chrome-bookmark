import { useState, FormEvent } from "react";
import { SettingsDialog } from "@/components/SettingsDialog";
import { LLMFactory } from "@/langgraph/agents/llm-factory";
import {
    useStreamingChat,
    useTextareaHeight,
    ChatHeader,
    ChatArea,
    ChatInput,
} from "./chat";

export function ChatPage() {
    const [input, setInput] = useState("");
    const [settingsOpen, setSettingsOpen] = useState(false);

    const { messages, isLoading, handleSubmit } = useStreamingChat();

    const {
        textareaHeight,
        textareaRef,
        adjustHeight,
        handleDragStart,
        resetHeight,
        maxHeight,
    } = useTextareaHeight();

    const handleSend = async (e: FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            await handleSubmit(input);
            setInput("");
            resetHeight();
        }
    };

    // 获取最后一条消息的思考步骤，用于顶部状态栏
    const lastMessage = messages[messages.length - 1];
    const currentThinking = lastMessage?.role === "assistant" ? lastMessage.thinking ?? [] : [];
    const lastThinkingStep = currentThinking?.length > 0 ? currentThinking[currentThinking.length - 1] : null;

    return (
        <div className="flex justify-end h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
            <div className="relative flex h-full w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark border-l border-slate-200 dark:border-slate-800 shadow-xl">
                <ChatHeader onOpenSettings={() => setSettingsOpen(true)} />

                {/* 实时状态指示器 */}
                {isLoading && lastThinkingStep && (
                    <div className="px-4 py-2 bg-primary/10 border-b border-primary/20 flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-primary">
                            <span className="material-symbols-outlined text-[16px] animate-spin">psychology</span>
                            <span className="truncate max-w-[400px]">
                                {lastThinkingStep.text}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                lastThinkingStep.status === "completed" ? "bg-emerald-500/20 text-emerald-600" :
                                lastThinkingStep.status === "in-progress" ? "bg-primary/20 text-primary animate-pulse" :
                                "bg-slate-300/30 text-slate-500"
                            }`}>
                                {lastThinkingStep.status}
                            </span>
                        </div>
                    </div>
                )}

                <ChatArea messages={messages} isLoading={isLoading} />

                <ChatInput
                    textareaHeight={textareaHeight}
                    textareaRef={textareaRef}
                    isLoading={isLoading}
                    input={input}
                    onInputChange={setInput}
                    onSend={handleSend}
                    onDragStart={handleDragStart}
                    onHeightChange={adjustHeight}
                    maxHeight={maxHeight}
                    showExamplePrompts={messages.length === 0}
                />

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
