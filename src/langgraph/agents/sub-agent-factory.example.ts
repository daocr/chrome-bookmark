/**
 * SubAgent Factory 使用示例
 *
 * 演示如何使用 SubAgentFactory 创建书签管理子代理
 */

import {
    SubAgentFactory,
    createAnalyzeAgent,
    createExecuteAgent,
    createSubAgent
} from "./sub-agent-factory";

// ============================================================================
// 示例 1: 使用工厂类方法创建代理
// ============================================================================

/**
 * 创建并使用 Analyze Agent（分析代理）
 *
 * 用于：书签分类、聚类分析、生成重命名方案、目录重构建议
 */
export async function exampleAnalyzeAgent() {
    const agent = await SubAgentFactory.createAnalyzeAgent();

    // 提示：Analyze Agent 现在拥有只读工具，可以自主调用 get_all_bookmarks
    const result = await agent.invoke({
        messages: [{
            role: "user",
            content: "请分析我目前的书签结构，并按照 '一级分类 / 二级分类' 的风格提供重组方案。请返回 JSON 格式。"
        }]
    });

    console.log("Analyze Agent 结果:", result);
    return result;
}

/**
 * 创建并使用 Execute Agent（执行代理）
 *
 * 用于：创建、移动、重命名、删除书签和清理空目录
 */
export async function exampleExecuteAgent() {
    const agent = await SubAgentFactory.createExecuteAgent();

    // Execute Agent 遵循闭环工作流：核实 -> 执行 -> 清理
    const result = await agent.invoke({
        messages: [{
            role: "user",
            content: "请核实 ID 为 12, 45 的书签是否存在，然后将它们移动到 ID 为 200 的文件夹下，并删除原本存放它们的旧文件夹 (ID: 9)"
        }]
    });

    console.log("Execute Agent 结果:", result);
    return result;
}

// ============================================================================
// 示例 2: 使用便捷函数创建代理
// ============================================================================

/**
 * 使用便捷函数创建代理
 */
export async function exampleConvenienceFunctions() {
    // 使用便捷函数创建代理
    const analyzeAgent = await createAnalyzeAgent();
    const executeAgent = await createExecuteAgent();

    console.log("子代理已创建:", {
        analyze: analyzeAgent,
        execute: executeAgent
    });

    return {analyzeAgent, executeAgent};
}

// ============================================================================
// 示例 3: 使用 createByType 方法
// ============================================================================

/**
 * 根据类型动态创建代理
 */
export async function exampleCreateByType() {
    const agentType = "analyze" as const;
    const agent = await SubAgentFactory.createByType(agentType);

    const result = await agent.invoke({
        messages: [{
            role: "user",
            content: "对所有书签进行语义聚类分析"
        }]
    });

    return result;
}

// ============================================================================
// 示例 4: 使用通用便捷函数
// ============================================================================

/**
 * 使用 createSubAgent 便捷函数
 */
export async function exampleCreateSubAgent() {
    // 指定代理类型创建
    const analyzeAgent = await createSubAgent("analyze");
    const executeAgent = await createSubAgent("execute");

    console.log("通过 createSubAgent 创建的代理:", {
        analyze: analyzeAgent,
        execute: executeAgent
    });

    return {analyzeAgent, executeAgent};
}

// ============================================================================
// 示例 5: 自定义配置覆盖
// ============================================================================

/**
 * 使用自定义配置覆盖默认设置
 */
export async function exampleCustomConfig() {
    // 使用自定义模型和温度
    const agent = await SubAgentFactory.createAnalyzeAgent({
        llmConfig: {
            model: "gpt-4-turbo",
            temperature: 0.7  // 提高温度以获得更有创意的分类方案
        },
        systemPrompt: "你是一个极其严谨的目录重构专家，请只输出最终的 JSON 结果。"
    });

    const result = await agent.invoke({
        messages: [{
            role: "user",
            content: "分析书签分类"
        }]
    });

    return result;
}

// ============================================================================
// 示例 6: 在任务分发中集成使用
// ============================================================================

/**
 * 在 callSubagent 工具中使用 SubAgentFactory
 */
export async function exampleTaskIntegration(
    subagentType: "analyze" | "execute",
    prompt: string
) {
    // 根据类型创建对应的代理
    const agent = await SubAgentFactory.createByType(subagentType);

    // 执行代理任务
    const result = await agent.invoke({
        messages: [{
            role: "user",
            content: prompt
        }]
    });

    return result;
}

// ============================================================================
// 导出所有示例
// ============================================================================

export const examples = {
    analyze: exampleAnalyzeAgent,
    execute: exampleExecuteAgent,
    convenience: exampleConvenienceFunctions,
    byType: exampleCreateByType,
    createSubAgent: exampleCreateSubAgent,
    customConfig: exampleCustomConfig,
    taskIntegration: exampleTaskIntegration
};
