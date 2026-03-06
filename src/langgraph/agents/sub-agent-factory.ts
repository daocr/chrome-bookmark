import {createAgent} from "langchain";
import {StructuredTool} from "@langchain/core/tools";
import {z} from "zod";
import {LLMFactory} from "./llm-factory";
// import {executionTools} from "../tools/bookmark-groups";
import {
    analyzeContextSchema,
    executeContextSchema
} from "../context";

// ============================================================================
// 提示词模板加载（兼容 Node 和浏览器环境）
// ============================================================================

import {SUB_AGENT_EXECUTION_PROMPT} from "./prompt/sub-agent-execution";
import {SUB_AGENT_ANALYZE_PROMPT} from "@/langgraph/agents/prompt/sub-agent-analyze.ts";

// ============================================================================
// 类型定义
// ============================================================================

export type SubAgentType = "analyze" | "execute";

export interface CreateSubAgentOptions {
    /**
     * Agent 可用的工具列表
     */
    tools?: StructuredTool[];

    /**
     * 中间件数组（可选）
     */
    middleware?: any[];

    /**
     * 系统提示词（可选）
     */
    systemPrompt?: string;

    /**
     * Agent 名称（可选）
     */
    name?: string;

    /**
     * LLM 配置覆盖（可选）
     */
    llmConfig?: {
        model?: string;
        temperature?: number;
    };

    /**
     * 上下文 Schema（可选）
     * 定义 Agent 运行时需要的上下文数据结构
     */
    contextSchema?: z.ZodObject<z.ZodRawShape>;
}

// ============================================================================
// SubAgent 工厂类
// ============================================================================

/**
 * SubAgent 工厂类
 * 用于创建独立的、隔离的子代理实例
 *
 * 支持两种预定义的代理类型：
 * - analyze: 重度推理与书签分类聚类
 * - execute: 拥有物理修改权限的代理，负责执行增删改移
 */
export class SubAgentFactory {
    /**
     * 创建一个新的 SubAgent 实例
     *
     * @param options - SubAgent 配置选项
     * @returns 编译后的 agent 实例
     */
    static async create(options: CreateSubAgentOptions) {
        const {
            tools = [],
            middleware = [],
            systemPrompt,
            name,
            llmConfig,
            contextSchema
        } = options;

        // 创建全新的 LLM 实例（不使用单例）
        const llm = await LLMFactory.createFreshLLM(llmConfig);

        // 使用 createAgent 创建 agent
        return createAgent({
            model: llm,
            tools,
            systemPrompt,
            middleware,
            name,
            contextSchema,
        });
    }

    /**
     * 创建 Analyze Agent（分析代理）
     *
     * 职责：对书签数据进行深度语义分析，提供分类、聚类或标签方案
     * 权限：只读权限（可查阅书签，但不修改）
     *
     * @param options - 可选配置覆盖
     * @returns 编译后的 analyze agent
     */
    static async createAnalyzeAgent(options?: Partial<CreateSubAgentOptions>) {
        const {readOnlyTools} = await import("../tools/bookmark-groups");
        const {createToolMonitoringMiddleware} = await import("../middleware/tool-monitoring");

        const analyzeName = "analyze";
        const monitoringMiddleware = createToolMonitoringMiddleware(analyzeName);

        // 合并中间件，确保用户传入的中间件也在其中
        const activeMiddleware = [monitoringMiddleware, ...(options?.middleware || [])];

        return this.create({
            tools: readOnlyTools,
            systemPrompt: SUB_AGENT_ANALYZE_PROMPT,
            llmConfig: {temperature: 0.5}, // 中等温度以平衡创造性和准确性
            contextSchema: analyzeContextSchema,
            ...options,
            // 确保覆盖 options 中的 name 和 middleware 以匹配我们在上面做的修改
            name: options?.name ?? analyzeName,
            // 注意：options 中的 middleware 如果有，已经在上面被拼接到 activeMiddleware 中了
            // 这里为了安全，覆盖 options 中的 middleware
            middleware: activeMiddleware
        });
    }

    /**
     * 创建 Execute Agent（执行代理）
     *
     * 职责：执行书签的物理修改操作（增、删、改、移）
     * 权限：完全修改权限 + 只读权限（用于验证状态）
     *
     * @param options - 可选配置覆盖
     * @returns 编译后的 execute agent
     */
    static async createExecuteAgent(options?: Partial<CreateSubAgentOptions>) {
        const {readOnlyTools, executionTools} = await import("../tools/bookmark-groups");
        const {createToolMonitoringMiddleware} = await import("../middleware/tool-monitoring");

        const executeName = "execute";
        const monitoringMiddleware = createToolMonitoringMiddleware(executeName);

        // 合并中间件
        const activeMiddleware = [monitoringMiddleware, ...(options?.middleware || [])];

        return this.create({
            tools: [...readOnlyTools, ...executionTools],
            systemPrompt: SUB_AGENT_EXECUTION_PROMPT,
            llmConfig: {temperature: 0.2}, // 极低温度以确保执行精确性
            contextSchema: executeContextSchema,
            ...options,
            name: options?.name ?? executeName,
            middleware: activeMiddleware
        });
    }

    /**
     * 根据类型创建对应的 SubAgent
     *
     * @param agentType - 代理类型 ("analyze" | "execute")
     * @param options - 可选配置覆盖
     * @returns 编译后的 agent
     */
    static async createByType(
        agentType: SubAgentType,
        options?: Partial<CreateSubAgentOptions>
    ) {
        switch (agentType) {
            case "analyze":
                return this.createAnalyzeAgent(options);
            case "execute":
                return this.createExecuteAgent(options);
            default:
                throw new Error(`Unknown agent type: ${agentType}`);
        }
    }
}

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 便捷函数：创建指定类型的 SubAgent
 */
export const createSubAgent = (
    agentType: SubAgentType,
    options?: Partial<CreateSubAgentOptions>
) => SubAgentFactory.createByType(agentType, options);

/**
 * 便捷函数：创建 Analyze Agent
 */
export const createAnalyzeAgent = (options?: Partial<CreateSubAgentOptions>) =>
    SubAgentFactory.createAnalyzeAgent(options);

/**
 * 便捷函数：创建 Execute Agent
 */
export const createExecuteAgent = (options?: Partial<CreateSubAgentOptions>) =>
    SubAgentFactory.createExecuteAgent(options);
