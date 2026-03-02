import {StateGraph, StateSchema, GraphNode, START} from "@langchain/langgraph";
import * as z from "zod";
import {LLMFactory} from "./agents/llm-factory.js";

// 定义状态模式
const MyState = new StateSchema({
    topic: z.string(),
    joke: z.string().default(""),
});

// 调用模型的节点
const callModel: GraphNode<typeof MyState> = async (state) => {
    // 使用 LLMFactory 获取 LLM 实例
    const model = await LLMFactory.createFreshLLM();

    // 调用 LLM 生成关于主题的笑话
    const modelResponse = await model.invoke([
        {role: "user", content: `Generate a joke about ${state.topic}`},
    ]);

    return {joke: modelResponse.content as string};
};

// 创建图
const graph = new StateGraph(MyState)
    .addNode("callModel", callModel)
    .addEdge(START, "callModel")
    .compile();

// 主函数
async function main() {
    console.log("🚀 开始测试 LangGraph + LLMFactory...\n");

    const topic = "ice cream";
    console.log(`📝 主题: ${topic}\n`);
    console.log("💭 正在生成笑话...\n");

    // 使用 "messages" 流模式
    // 返回 [messageChunk, metadata] 元组迭代器
    console.log("📤 流式输出:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    for await (const event of await graph.stream(
        {topic},
        {streamMode: ["updates", "custom", "messages"]}
    )) {
        // event 是一个数组 [mode, payload]
        // mode: "messages" | "updates" | "custom"
        // payload: 根据模式不同，结构不同
        const mode = event[0];
        const payload = event[1];

        // 处理 messages 模式
        // payload 是 [messageChunk, metadata]
        if (mode === "messages" && Array.isArray(payload) && payload[0]) {
            const messageChunk = payload[0] as { content?: string };
            if (messageChunk.content) {
                process.stdout.write(messageChunk.content);
            }
        }

        // 处理 updates 模式
        // payload 是 [stateUpdate, metadata]
        if (mode === "updates" && Array.isArray(payload) && payload[0]) {
            // 状态更新处理示例:
            // const stateUpdate = payload[0] as { joke?: string; topic?: string };
        }

        // 处理 custom 模式
        // payload 结构取决于自定义实现
        if (mode === "custom" && Array.isArray(payload) && payload[0]) {
            // 自定义数据处理
        }
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // 获取最终状态
    const finalState = await graph.invoke({topic});
    console.log(`\n✅ 完成!`);
    console.log(`📄 最终笑话: ${finalState.joke}`);
}

// 运行测试
main().catch((error) => {
    console.error("❌ 发生错误:", error);
    process.exit(1);
});
