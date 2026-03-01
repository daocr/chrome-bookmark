export interface ThinkingStep {
    text: string;
    status: "completed" | "in-progress" | "pending";
}

export interface Message {
    role: "user" | "assistant";
    content: string;
    thinking?: ThinkingStep[];
    actions?: Array<{ label: string; type: "primary" | "secondary" }>;
    timestamp?: string;
}
