import { useState } from "react";
import { invokeAgent, printResult } from "@/langgraph/agents/agent";
import { Message } from "./types";

export function useChatForm() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (input: string): Promise<void> => {
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

        setIsLoading(true);

        try {
            // Call agent
            const result = await invokeAgent(input);

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

    return {
        messages,
        isLoading,
        handleSubmit,
        setMessages,
    };
}
