import {tool} from "@langchain/core/tools";
import {z} from "zod";

export const askQuestion = tool(
    async ({questions}, _config) => {
        // 【修复】：读取 questions 并将其拼接到返回信息中，
        // 实际开发中，你可能会在这里触发一个 Event 或者抛出一个特定的 Error
        // 来让 LangGraph 暂停，并将 questions 传递给前端。
        const questionsList = questions.map(q => q.question).join(" | ");

        return JSON.stringify({
            success: true,
            status: "WAITING_FOR_USER",
            data: questions, // 将结构化的问题数据透传回状态机
            message: `Execution paused. Sent questions to user UI: [${questionsList}]. Please wait for user reply.`
        });
    },
    {
        name: "ask_question",
        description: `Use this tool when you need to ask the user questions during execution.
        This allows you to:
        1. Gather user preferences or requirements.
        2. Clarify ambiguous instructions (e.g., multiple folders have the same name).
        3. Get decisions on implementation choices as you work.
        4. Offer choices to the user about what direction to take.`,
        schema: z.object({
            questions: z.array(z.object({
                question: z.string().describe("The specific question to ask the user"),
                options: z.array(z.string()).optional().describe("Provide a list of selectable labels if you want to give the user choices"),
                allowCustom: z.boolean().default(true).describe("Set to false if the user MUST choose from the provided options"),
            })).describe("Questions to ask the user"),
        }),
    }
);

export const requestPlanApproval = tool(
    async ({summary}, _config) => {
        // 【修复】：读取 summary，这对于让用户看到重构计划至关重要
        return JSON.stringify({
            success: true,
            status: "WAITING_FOR_APPROVAL",
            data: {summary}, // 透传计划摘要
            message: `Plan submitted for user approval. Summary: ${summary}. Halt execution until the user approves.`
        });
    },
    {
        name: "request_plan_approval",
        description: `Call this tool AFTER you have finalized a complex restructuring plan but BEFORE you execute any destructive actions (like mass moving or deleting).
        This tool will ask the user if they approve the plan and want to proceed with the execution.`,
        schema: z.object({
            summary: z.string().describe("A clear, user-friendly markdown summary of the actions you are about to take (e.g., what folders will be created, what items will be deleted)."),
        }),
    }
);

// export const interactionTools = [askQuestion, requestPlanApproval];
export const interactionTools = [askQuestion];