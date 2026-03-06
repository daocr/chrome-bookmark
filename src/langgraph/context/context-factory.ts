/**
 * Context Factory
 *
 * 为不同的 SubAgent 创建对应的上下文对象
 * 可以从 config 或其他来源获取配置参数
 */

import type {AnalyzeContext, ExecuteContext} from "./index";
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
     * 为 Analyze Agent 创建上下文
     *
     * @param options - 配置选项
     * @returns Analyze Agent 上下文对象
     */
    static createAnalyzeContext(_options?: ContextFactoryOptions): AnalyzeContext {
        return {};
    }

    /**
     * 为 Execute Agent 创建上下文
     *
     * @param options - 配置选项
     * @returns Execute Agent 上下文对象
     */
    static createExecuteContext(_options?: ContextFactoryOptions): ExecuteContext {
        return {};
    }

    /**
     * 根据 SubAgent 类型创建对应的上下文
     *
     * @param agentType - SubAgent 类型
     * @param options - 配置选项
     * @returns 对应 Agent 的上下文对象
     */
    static createContextByType(
        agentType: "analyze" | "execute",
        options?: ContextFactoryOptions
    ): AnalyzeContext | ExecuteContext {
        switch (agentType) {
            case "analyze":
                return this.createAnalyzeContext(options);
            case "execute":
                return this.createExecuteContext(options);
            default:
                throw new Error(`Unknown agent type: ${agentType}`);
        }
    }
}
