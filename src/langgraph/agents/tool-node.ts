import {AIMessage, ToolMessage} from "@langchain/core/messages";
import {primaryAgentTools} from "../tools";
import {AgentState} from "../state";
import {LangGraphRunnableConfig} from "@langchain/langgraph";

// 导出 AgentState 类型供其他模块使用
export type {AgentState};

/**
 * 创建工具名称到工具实例的映射
 *
 * 主代理使用的工具集 (primaryAgentTools):
 * - call_subagent: 委派任务给子代理
 * - ask_question: 向用户提问
 * - request_plan_approval: 请求批准计划
 * - write_todo: 写入待办事项
 * - read_todo: 读取待办事项
 */
const toolsByName = Object.fromEntries(
    primaryAgentTools.map((tool) => [tool.name, tool])
);

/**
 * Tool Node - 执行 LLM 返回的工具调用
 *
 * 这个节点会：
 * 1. 获取最后一条消息
 * 2. 检查是否包含工具调用
 * 3. 执行所有工具调用
 * 4. 返回工具执行结果
 * 5. 通过 config.writer() 发送工具执行进度
 */
export const toolNode = async (
    state: typeof AgentState.State,
    config?: LangGraphRunnableConfig
) => {
    const messages = state.messages as any[];
    const lastMessage = messages[messages.length - 1];

    if (lastMessage == null || !AIMessage.isInstance(lastMessage)) {
        return {
            messages: [],
        };
    }

    const result = [];
    const toolCalls = lastMessage.tool_calls ?? [];

    // 发送工具执行开始事件
    if (toolCalls.length > 0) {
        config?.writer?.({
            type: "tool_execution_start",
            count: toolCalls.length,
            tools: toolCalls.map((tc: any) => ({name: tc.name, args: tc.args})),
        });
    }

    for (let i = 0; i < toolCalls.length; i++) {
        const toolCall = toolCalls[i];
        const tool = toolsByName[toolCall.name];

        if (!tool) {
            console.warn(`Tool "${toolCall.name}" not found`);
            result.push(new ToolMessage({
                content: `Error: Tool "${toolCall.name}" not found`,
                tool_call_id: toolCall.id || "",
            }));
            continue;
        }

        // 发送单个工具开始执行事件
        config?.writer?.({
            type: "tool_start",
            name: toolCall.name,
            args: toolCall.args,
            index: i,
            total: toolCalls.length,
        });

        try {
            // 按官方方式：直接传入 toolCall 对象
            const observation = await (tool as any).invoke(toolCall);
            console.warn(`Tool observation "${toolCall.name}":`, observation.content || JSON.stringify(observation));
            result.push(observation);

            // 发送工具执行完成事件
            config?.writer?.({
                type: "tool_end",
                name: toolCall.name,
                output: observation.content || observation,
                index: i,
                total: toolCalls.length,
            });
        } catch (error) {
            console.error(`Error invoking tool "${toolCall.name}":`, error);
            const errorMsg = `Error: ${error instanceof Error ? error.message : String(error)}`;
            result.push(new ToolMessage({
                content: errorMsg,
                tool_call_id: toolCall.id || "",
            }));

            // 发送工具执行错误事件
            config?.writer?.({
                type: "tool_error",
                name: toolCall.name,
                error: errorMsg,
                index: i,
                total: toolCalls.length,
            });
        }
    }

    // 发送所有工具执行完成事件
    if (toolCalls.length > 0) {
        config?.writer?.({
            type: "tool_execution_end",
            count: toolCalls.length,
        });
    }

    return {
        messages: result,
        count: state.count + 1,
    };
};
