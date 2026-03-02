import {createAgent} from "langchain";
import {StructuredTool} from "@langchain/core/tools";
import {LLMFactory} from "./llm-factory";
import {readOnlyTools, executionTools} from "../tools/bookmarks";

// ============================================================================
// 提示词模板加载（兼容 Node 和浏览器环境）
// ============================================================================

import {SUB_AGENT_EXPLORE_PROMPT} from "./prompt/sub-agent-explore";
import {SUB_AGENT_ANALYZE_PROMPT} from "./prompt/sub-agent-analyze";
import {SUB_AGENT_EXECUTION_PROMPT} from "./prompt/sub-agent-execution";

// ============================================================================
// 类型定义
// ============================================================================

export type SubAgentType = "explore" | "analyze" | "execute";

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
}

// ============================================================================
// SubAgent 工厂类
// ============================================================================

/**
 * SubAgent 工厂类
 * 用于创建独立的、隔离的子代理实例
 *
 * 支持三种预定义的代理类型：
 * - explore: 只读的书签检索、目录树读取
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
            llmConfig
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
        });
    }

    /**
     * 创建 Explore Agent（探索代理）
     *
     * 职责：快速查找特定的书签或文件夹，探索和读取现有的书签目录层级结构
     * 权限：只读（无修改权限）
     *
     * @param options - 可选配置覆盖
     * @returns 编译后的 explore agent
     */
    static async createExploreAgent(options?: Partial<CreateSubAgentOptions>) {
        return this.create({
            tools: readOnlyTools,
            systemPrompt: SUB_AGENT_EXPLORE_PROMPT,
            name: "explore",
            llmConfig: {temperature: 0.3}, // 低温度以获得更精确的检索结果
            ...options
        });
    }

    /**
     * 创建 Analyze Agent（分析代理）
     *
     * 职责：对书签数据进行深度语义分析，提供分类、聚类或标签方案
     * 权限：无副作用（仅分析，不操作数据）
     *
     * @param options - 可选配置覆盖
     * @returns 编译后的 analyze agent
     */
    static async createAnalyzeAgent(options?: Partial<CreateSubAgentOptions>) {
        return this.create({
            tools: [], // 分析代理不需要工具，只进行推理
            systemPrompt: SUB_AGENT_ANALYZE_PROMPT,
            name: "analyze",
            llmConfig: {temperature: 0.5}, // 中等温度以平衡创造性和准确性
            ...options
        });
    }

    /**
     * 创建 Execute Agent（执行代理）
     *
     * 职责：执行书签的物理修改操作（增、删、改、移）
     * 权限：完全修改权限（需严格控制）
     *
     * @param options - 可选配置覆盖
     * @returns 编译后的 execute agent
     */
    static async createExecuteAgent(options?: Partial<CreateSubAgentOptions>) {
        return this.create({
            tools: executionTools,
            systemPrompt: SUB_AGENT_EXECUTION_PROMPT,
            name: "execute",
            llmConfig: {temperature: 0.2}, // 极低温度以确保执行精确性
            ...options
        });
    }

    /**
     * 根据类型创建对应的 SubAgent
     *
     * @param agentType - 代理类型 ("explore" | "analyze" | "execute")
     * @param options - 可选配置覆盖
     * @returns 编译后的 agent
     *
     * @example
     * ```ts
     * const agent = await SubAgentFactory.createByType("explore");
     * const result = await agent.invoke({
     *     messages: [{ role: "user", content: "搜索 React 书签" }]
     * });
     * ```
     */
    static async createByType(
        agentType: SubAgentType,
        options?: Partial<CreateSubAgentOptions>
    ) {
        switch (agentType) {
            case "explore":
                return this.createExploreAgent(options);
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
 * 便捷函数：创建 Explore Agent
 */
export const createExploreAgent = (options?: Partial<CreateSubAgentOptions>) =>
    SubAgentFactory.createExploreAgent(options);

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
