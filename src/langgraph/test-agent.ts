import {agent} from "./agents/agent";
import {HumanMessage} from "@langchain/core/messages";

/**
 * 主测试函数
 */
async function main() {
    console.log("🚀 开始测试 Agent 流式调用...\n");

    const userInput = "你好";
    console.log(`📝 用户输入: ${userInput}\n`);
    console.log("📤 流式输出:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    try {
        // 直接调用 agent.stream
        const stream = await agent.stream(
            {
                messages: [new HumanMessage(userInput)],
                count: 0,
            },
            {
                recursionLimit: 100,
                streamMode: ["updates", "custom", "messages"],
            }
        );

        // 处理流式输出
        for await (const chunk of stream) {
            // chunk 是 [mode, data] 二元组
            if (Array.isArray(chunk) && chunk.length === 2) {
                const [mode, data] = chunk;

                // 处理自定义事件
                if (mode === "custom") {
                    console.log(`🎨 [custom]`, JSON.stringify(data, null, 2));
                }
                // 处理 messages 模式（LLM token 流）
                else if (mode === "messages") {
                    console.log(`📝 [messages]`, JSON.stringify(chunk, null, 2));
                    const [messageChunk] = data;
                    if (messageChunk?.content) {
                        console.log(`📝 [messages] ${messageChunk.content}`);
                    }
                }
                // 处理更新事件
                else if (mode === "updates") {
                    console.log(`🔄 [updates]`, JSON.stringify(data, null, 2));
                }
            }
        }

        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("\n✅ 测试完成!");

    } catch (error) {
        console.error("❌ 测试失败:", error);
        process.exit(1);
    }
}

// 运行测试
main().catch((error) => {
    console.error("❌ 发生错误:", error);
    process.exit(1);
});
