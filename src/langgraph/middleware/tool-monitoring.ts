import {createMiddleware} from "langchain";
import {SUBAGENT_CUSTOM} from "../events/subagent";

export const createToolMonitoringMiddleware = (agentName: string = "UnknownAgent") => {
    return createMiddleware({
        name: "ToolMonitoringMiddleware",
        wrapToolCall: async (request: any, handler: any) => {
            const toolName = request.toolCall.name;
            const toolArgs = request.toolCall.args;

            console.log(`[${agentName}] Executing tool: ${toolName}`);
            console.log(`[${agentName}] Arguments: ${JSON.stringify(toolArgs)}`);

            // 触发工具执行开始事件
            if (request.runtime?.writer) {
                request.runtime.writer({
                    type: SUBAGENT_CUSTOM,
                    subagent_type: agentName,
                    event: {
                        status: "tool_start",
                        toolName: toolName,
                        args: toolArgs
                    }
                });
            }

            try {
                // handler 通常是异步的，因此建议使用 await
                const result = await handler(request);
                console.log(`[${agentName}] Tool ${toolName} completed successfully`);

                // 触发工具执行成功事件
                if (request.runtime?.writer) {
                    request.runtime.writer({
                        type: SUBAGENT_CUSTOM,
                        subagent_type: agentName,
                        event: {
                            status: "tool_success",
                            toolName: toolName,
                            result: result
                        }
                    });
                }

                return result;
            } catch (e: any) {
                console.error(`[${agentName}] Tool ${toolName} failed:`, e);

                // 触发工具执行失败事件
                if (request.runtime?.writer) {
                    request.runtime.writer({
                        type: SUBAGENT_CUSTOM,
                        subagent_type: agentName,
                        event: {
                            status: "tool_error",
                            toolName: toolName,
                            error: e?.message || String(e)
                        }
                    });
                }

                throw e;
            }
        },
    });
};

