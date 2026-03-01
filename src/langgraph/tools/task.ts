import {tool} from "@langchain/core/tools";
import {z} from "zod";
import {SubAgentFactory} from "../agents/sub-agent-factory";

// 使用 Vite ?raw 导入外部的 txt 描述文件
import TASK_DESCRIPTION_TEMPLATE from "../agents/prompt/subagent_task.txt?raw";

export const callSubagent = tool(
    async (params, _config) => {
        // 1. 实际读取并解构 params
        const {subagent_type, description, prompt, task_id} = params;

        console.log(`[Main Agent] 正在调用子代理: ${subagent_type}`);
        console.log(`[Main Agent] 任务描述: ${description}`);
        console.log(`[Main Agent] Prompt: ${prompt}`);

        try {
            // 2. 使用 SubAgentFactory 创建对应类型的代理
            const agent = await SubAgentFactory.createByType(subagent_type);

            // 3. 调用子代理执行任务
            const result = await agent.invoke({
                messages: [{
                    role: "user",
                    content: prompt
                }]
            });

            // 4. 提取子代理的最终回复
            const lastMessage = result.messages?.[result.messages.length - 1];
            const responseContent = lastMessage?.content || JSON.stringify(result);

            // 5. 返回子代理的执行结果给主 Agent
            return JSON.stringify({
                success: true,
                status: "SUBAGENT_COMPLETED",
                task_id: task_id || `session_${Date.now()}`,
                subagent_type,
                result: responseContent,
                message: `子代理 ${subagent_type} 已完成: ${description}`
            });
        } catch (error) {
            console.error(`[Main Agent] 子代理 ${subagent_type} 执行失败:`, error);
            return JSON.stringify({
                success: false,
                status: "SUBAGENT_FAILED",
                subagent_type,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    },
    {
        name: "call_subagent",
        description: TASK_DESCRIPTION_TEMPLATE.replace(
            "{agents}",
            `- explore: 负责纯只读的书签检索、目录树读取。\n- analyze: 负责重度推理与书签分类聚类。\n- execute: 唯一拥有物理修改权限的代理，负责执行增删改移。`
        ),
        schema: z.object({
            subagent_type: z.enum(["explore", "analyze", "execute"]).describe("The type of specialized agent to use."),
            description: z.string().describe("A short (3-5 words) description of the task."),
            prompt: z.string().describe("The highly detailed task instruction for the agent to perform, including all specific IDs and context."),
            task_id: z.string().optional().describe("Pass a prior task_id to resume a previous subagent session instead of starting fresh.")
        }),
    }
);