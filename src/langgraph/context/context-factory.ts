/**
 * Context Factory
 *
 * 为不同的 SubAgent 创建对应的上下文对象
 * 可以从 config 或其他来源获取配置参数
 */

import type {ExploreContext, AnalyzeContext, ExecuteContext} from "./index";
import {LangGraphRunnableConfig} from "@langchain/langgraph";

export interface ContextFactoryOptions {
    /**
     * 从 LangGraph config 中获取的配置（可选）
     */
    config?: LangGraphRunnableConfig;

    /**
     * 额外的配置参数（可选）
     */
    extra?: Record<string, any>;
}

/**
 * Context 工厂类
 * 用于为不同类型的 SubAgent 创建对应的上下文对象
 */
export class ContextFactory {
    /**
     * 为 Explore Agent 创建上下文
     *
     * @param options - 配置选项
     * @returns Explore Agent 上下文对象
     */
    static createExploreContext(_options?: ContextFactoryOptions): ExploreContext {
        // TODO: 从 config 或其他来源获取实际配置
        return {
            // maxResults: _options?.extra?.maxResults || 20,
            // searchRootId: _options?.extra?.searchRootId,
            // userPreferences: _options?.extra?.userPreferences,
            taskResultList: _options?.extra?.taskResultList || [],
        };
    }

    /**
     * 为 Analyze Agent 创建上下文
     *
     * @param options - 配置选项
     * @returns Analyze Agent 上下文对象
     */
    static createAnalyzeContext(_options?: ContextFactoryOptions): AnalyzeContext {
        // TODO: 从 config 或其他来源获取实际配置
        return {
            // categoryStyle: _options?.extra?.categoryStyle || "concise",
            // maxCategories: _options?.extra?.maxCategories || 10,
            // outputFormat: _options?.extra?.outputFormat || "json",
            // analysisDepth: _options?.extra?.analysisDepth || "shallow",
        };
    }

    /**
     * 为 Execute Agent 创建上下文
     *
     * @param options - 配置选项
     * @returns Execute Agent 上下文对象
     */
    static createExecuteContext(_options?: ContextFactoryOptions): ExecuteContext {
        // TODO: 从 config 或其他来源获取实际配置
        return {
            // defaultTargetFolderId: _options?.extra?.defaultTargetFolderId,
            // undoStackSize: _options?.extra?.undoStackSize || 50,
            // operationLimit: _options?.extra?.operationLimit || 100,
            // dryRun: _options?.extra?.dryRun || false,
        };
    }

    /**
     * 根据 SubAgent 类型创建对应的上下文
     *
     * @param agentType - SubAgent 类型
     * @param options - 配置选项
     * @returns 对应 Agent 的上下文对象
     */
    static createContextByType(
        agentType: "explore" | "analyze" | "execute",
        options?: ContextFactoryOptions
    ): ExploreContext | AnalyzeContext | ExecuteContext {
        switch (agentType) {
            case "explore":
                return this.createExploreContext(options);
            case "analyze":
                return this.createAnalyzeContext(options);
            case "execute":
                return this.createExecuteContext(options);
            default:
                throw new Error(`Unknown agent type: ${agentType}`);
        }
    }
}
