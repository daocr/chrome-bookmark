import { useState, FormEvent } from "react";
import { SettingsDialog } from "@/components/SettingsDialog";
import { LLMFactory } from "@/langgraph/agents/llm-factory";
import {
    useChatForm,
    useTextareaHeight,
    ChatHeader,
    ChatArea,
    ChatInput,
} from "./chat";

export function ChatPage() {
    const [input, setInput] = useState("");
    const [settingsOpen, setSettingsOpen] = useState(false);

    const { messages, isLoading, handleSubmit } = useChatForm();
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

    return (
        <div className="flex justify-end h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
            <div className="relative flex h-full w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark border-l border-slate-200 dark:border-slate-800 shadow-xl">
                <ChatHeader onOpenSettings={() => setSettingsOpen(true)} />

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
