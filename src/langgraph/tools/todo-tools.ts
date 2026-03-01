import {tool} from "@langchain/core/tools";
import {z} from "zod";

// 模拟全局或 Session 级别的 Todo 存储
// 实际应用中可以将其存入 chrome.storage.session 或传给前端 UI 渲染
let currentTodos: any[] = [];

export const writeTodo = tool(
    async ({todos}, _config) => {
        currentTodos = todos;
        const pendingCount = todos.filter((x: any) => x.status !== "completed" && x.status !== "cancelled").length;

        return JSON.stringify({
            success: true,
            message: `Todo list updated. You have ${pendingCount} active tasks remaining.`,
            todos: currentTodos
        });
    },
    {
        name: "write_todo",
        description: `Use this tool to create and manage a structured task list for your current session.
        WHEN TO USE: 
        - Complex multistep tasks (3 or more distinct steps).
        - When users provide a list of things to be done.
        WHEN NOT TO USE:
        - Single, straightforward tasks.
        RULES:
        - Update task status in real-time as you work.
        - Mark tasks complete IMMEDIATELY after finishing (don't batch completions).
        - Only have ONE task "in_progress" at any time. Complete current tasks before starting new ones.`,
        schema: z.object({
            todos: z.array(z.object({
                id: z.string().describe("Unique identifier for the task (e.g., 'task_1')"),
                description: z.string().describe("Clear, actionable description of the step"),
                status: z.enum(["pending", "in_progress", "completed", "cancelled"]).describe("Current state of the task"),
            })).describe("The complete, updated array of ALL tasks for the current session."),
        }),
    }
);

export const readTodo = tool(
    async (_input, _config) => {
        if (currentTodos.length === 0) {
            return JSON.stringify({success: true, message: "No todos exist yet.", todos: []});
        }
        return JSON.stringify({success: true, todos: currentTodos});
    },
    {
        name: "read_todo",
        description: `Use this tool to read the current to-do list for the session. 
        Use this frequently to ensure you are aware of the status of the current task list, especially before starting new tasks or after completing one. 
        This tool takes NO parameters. Leave the input empty.`,
        schema: z.object({}),
    }
);

export const todoTools = [writeTodo, readTodo];