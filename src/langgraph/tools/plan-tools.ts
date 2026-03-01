import {tool} from "@langchain/core/tools";
import {z} from "zod";

/**
 * 进入规划模式工具
 * 遇到复杂任务先调研，绝不直接动手。
 */
export const planEnter = tool(
    async ({reason}, _config) => {
        // 【修复】：实际读取并使用了 reason
        return JSON.stringify({
            success: true,
            status: "SWITCHING_TO_PLAN_MODE",
            data: {reason}, // 透传给前端，前端可以提示用户："AI 请求进入规划模式，因为：xxx"
            message: `User confirmed to switch to plan mode. You are now in PLAN MODE. Begin your research and planning. Do NOT execute any changes yet. Reason: ${reason}`
        });
    },
    {
        name: "plan_enter",
        description: `Use this tool to suggest switching to plan agent when the user's request would benefit from planning before implementation.
        If they explicitly mention wanting to create a plan ALWAYS call this tool first.
        This tool will ask the user if they want to switch to plan agent.
        
        Call this tool when:
        - The user's request is complex and would benefit from planning first
        - You want to research and design before making changes
        - The task involves significant folder restructuring or mass deletions
        
        Do NOT call this tool:
        - For simple, straightforward tasks (like adding a single bookmark)
        - When the user explicitly wants immediate implementation`,
        schema: z.object({
            reason: z.string().describe("Explain to the user WHY you think we need to plan first (e.g., '由于涉及大量书签的移动，我建议先整理一份目录框架给您过目').")
        }),
    }
);

/**
 * 退出规划模式工具
 * 方案定稿，申请进入执行阶段。
 */
export const planExit = tool(
    async ({plan_summary}, _config) => {
        // 【修复】：彻底消除了 TS6133 报错！
        // 将 plan_summary 放在 data 字段中，供你的 LangGraph 节点拦截并发送给前端 UI 渲染 Markdown
        return JSON.stringify({
            success: true,
            status: "WAITING_FOR_PLAN_APPROVAL", // 更准确的状态名
            data: {plan_summary},
            message: `Plan submitted for user approval. Summary: ${plan_summary}\n\nHalt execution until the user approves. Once approved, switch to execution mode.`
        });
    },
    {
        name: "plan_exit",
        description: `Use this tool when you have completed the planning phase and are ready to exit plan agent.
        This tool will ask the user if they want to switch to build agent to start implementing the plan.
        
        Call this tool:
        - After you have written a complete plan (e.g., the new folder JSON structure)
        - After you have clarified any questions with the user
        - When you are confident the plan is ready for implementation
        
        Do NOT call this tool:
        - Before you have created or finalized the plan
        - If you still have unanswered questions about the implementation
        - If the user has indicated they want to continue planning`,
        schema: z.object({
            plan_summary: z.string().describe("A comprehensive Markdown summary of the FINAL plan. Show exactly what will be created, moved, or deleted.")
        }),
    }
);

export const planningTools = [planEnter, planExit];