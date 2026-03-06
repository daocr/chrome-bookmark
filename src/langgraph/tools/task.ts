import {tool} from "@langchain/core/tools";
import {z} from "zod";
import {SubAgentFactory} from "../agents/sub-agent-factory";
import {LangGraphRunnableConfig} from "@langchain/langgraph";
import {
    SUBAGENT_START,
    SUBAGENT_THINKING,
    SUBAGENT_CUSTOM,
    SUBAGENT_END,
    SUBAGENT_ERROR,
} from "../events";
import {ContextFactory} from "../context";

// 导入任务描述模板（兼容 Node 和浏览器环境）
import {SUBAGENT_TASK_PROMPT} from "../agents/prompt/subagent_task";

export const callSubagent = tool(
    async (params, config: LangGraphRunnableConfig) => {
        // 1. 实际读取并解构 params
        const {subagent, description, prompt, task_id} = params;

        console.log(`[Main Agent] 正在调用子代理: ${subagent}`);
        console.log(`[Main Agent] 任务描述: ${description}`);
        console.log(`[Main Agent] Prompt: ${prompt}`);

        // 发送子代理开始事件
        config?.writer?.({
            type: SUBAGENT_START,
            subagent,
            description,
            task_id: task_id || `task_${Date.now()}`,
        });

        try {


            // 2. 使用 SubAgentFactory 创建对应类型的代理
            const agent = await SubAgentFactory.createByType(subagent);

            // 3. 使用 ContextFactory 创建对应的上下文
            const context = ContextFactory.createContextByType(subagent, {
                config,
                // extra: { /* 可从 params 中提取的额外配置 */ }
            });

            // 4. 流式调用子代理，并发送进度事件
            config?.writer?.({
                type: SUBAGENT_THINKING,
                subagent,
                content: `正在执行任务: ${description}`,
            });

            // 使用 stream 模式获取子代理的执行进度和最终结果
            const stream = await agent.stream(
                {
                    messages: [{
                        role: "user",
                        content: prompt
                    }]
                },
                {
                    streamMode: ["updates", "custom"],
                    context
                }
            );

            let subagentResult: any = null;
            let lastUpdate: any = null;

            // 处理子代理的流式输出
            for await (const chunk of stream) {
                // 检查是否是 [mode, data] 元组
                if (Array.isArray(chunk) && chunk.length === 2) {
                    const [mode, data] = chunk;

                    if (mode === "custom") {
                        // 转发自定义事件（包含思考过程等重要信息）
                        config?.writer?.({
                            type: SUBAGENT_CUSTOM,
                            subagent,
                            event: data,
                        });
                    } else if (mode === "updates") {
                        // 保存最后一次的 updates，它包含最终状态
                        lastUpdate = data;
                    }
                }
            }

            // 从最后的 updates 中获取最终结果
            if (lastUpdate) {
                // 合并所有节点的更新到最终状态
                subagentResult = {messages: []};
                for (const nodeName in lastUpdate) {
                    const nodeData = lastUpdate[nodeName];
                    if (nodeData.messages) {
                        subagentResult.messages.push(...nodeData.messages);
                    }
                }
            } else {
                throw new Error("未能从子代理流中获取最终结果");
            }

            // 4. 提取子代理的最终回复
            const lastMessage = subagentResult.messages?.[subagentResult.messages.length - 1];
            let responseContent = lastMessage?.content || JSON.stringify(subagentResult);

            // 发送子代理完成事件
            config?.writer?.({
                type: SUBAGENT_END,
                subagent,
                result: responseContent,
            });

            // 5. 返回子代理的执行结果给主 Agent
            return JSON.stringify({
                success: true,
                status: "SUBAGENT_COMPLETED",
                task_id: task_id || `session_${Date.now()}`,
                subagent,
                result: responseContent,
                message: `子代理 ${subagent} 已完成: ${description}`
            });
        } catch (error) {
            console.error(`[Main Agent] 子代理 ${subagent} 执行失败:`, error);

            // 发送子代理错误事件
            config?.writer?.({
                type: SUBAGENT_ERROR,
                subagent,
                error: error instanceof Error ? error.message : String(error),
            });

            return JSON.stringify({
                success: false,
                status: "SUBAGENT_FAILED",
                subagent,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    },
    {
        name: "call_subagent",
        description: SUBAGENT_TASK_PROMPT.replace(
            "{agents}",
            ` analyze: 负责重度推理与书签分类聚类。\n- execute: 唯一拥有物理修改权限的代理，负责执行增删改移。`
        ),
        schema: z.object({
            subagent: z.enum(["analyze", "execute"]).describe("The type of specialized agent to use."),
            description: z.string().describe("A short (3-5 words) description of the task."),
            prompt: z.string().describe("The highly detailed task instruction for the agent to perform, including all specific IDs and context."),
            task_id: z.string().optional().describe("Pass a prior task_id to resume a previous subagent session instead of starting fresh.")
        }),
    }
);
