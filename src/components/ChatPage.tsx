import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SettingsDialog } from "@/components/SettingsDialog";
import { invokeAgent, printResult } from "@/langgraph/agents/agent";
import { LLMFactory } from "@/langgraph/agents/llm-factory";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  console.log("[ChatPage] Component rendered");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[ChatPage] Form submitted with input:", input);

    if (!input.trim()) return;

    // 添加用户消息
    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);

    const userInput = input;
    setInput("");
    setIsLoading(true);

    try {
      // 调用 agent
      const result = await invokeAgent(userInput);

      // 打印结果到控制台
      console.log("=== Agent Result ===");
      printResult(result);
      console.log("====================");

      // 提取 AI 响应内容
      const lastMessage = result.messages[result.messages.length - 1] as any;
      const assistantContent = lastMessage?.content || lastMessage?.text || JSON.stringify(lastMessage);

      // 添加助手消息
      const assistantMessage: Message = { role: "assistant", content: assistantContent };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Agent invocation error:", error);

      const errorMessage: Message = {
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Bookmark Assistant</h1>
          <p className="text-sm text-muted-foreground">Ask me to manage your bookmarks</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          title="设置"
        >
          ⚙️
        </Button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Start a conversation about your bookmarks...</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2">
              <p className="text-sm text-muted-foreground">Thinking...</p>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your bookmarks..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? "Sending..." : "Send"}
          </Button>
        </form>

        {/* Example Prompts */}
        {messages.length === 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInput("帮我搜索包含 'github' 的书签")}
            >
              Search GitHub
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInput("Show me my recent bookmarks")}
            >
              Recent Bookmarks
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInput("Get my entire bookmark tree")}
            >
              Bookmark Tree
            </Button>
          </div>
        )}
      </div>

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={async (config) => {
          LLMFactory.reset();
          // 重新创建 LLM 实例会使用新的配置
          await LLMFactory.createLLM(config);
        }}
      />
    </div>
  );
}
