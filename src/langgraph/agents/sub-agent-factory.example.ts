/**
 * SubAgent Factory 使用示例
 *
 * 演示如何使用 SubAgentFactory 创建三种专门的书签管理代理
 */

import {
    SubAgentFactory,
    createExploreAgent,
    createAnalyzeAgent,
    createExecuteAgent,
    createSubAgent
} from "./sub-agent-factory";

// ============================================================================
// 示例 1: 使用工厂类方法创建代理
// ============================================================================

/**
 * 创建并使用 Explore Agent（探索代理）
 *
 * 用于：搜索书签、查看目录结构
 */
export async function exampleExploreAgent() {
    const agent = await SubAgentFactory.createExploreAgent();

    const result = await agent.invoke({
        messages: [{
            role: "user",
            content: "帮我找一下所有关于 React 的书签在哪里"
        }]
    });

    console.log("Explore Agent 结果:", result);
    return result;
}

/**
 * 创建并使用 Analyze Agent（分析代理）
 *
 * 用于：书签分类、聚类分析、生成标签方案
 */
export async function exampleAnalyzeAgent() {
    const agent = await SubAgentFactory.createAnalyzeAgent();

    // 提供一批书签数据，请求分类方案
    const bookmarksData = [
        {id: "12", title: "React 官方文档", url: "https://react.dev"},
        {id: "45", title: "Vue.js 入门", url: "https://vuejs.org"},
        {id: "88", title: "Angular 指南", url: "https://angular.io"},
        {id: "91", title: "Svelte 教程", url: "https://svelte.dev"},
        {id: "102", title: "Next.js 文档", url: "https://nextjs.org"},
    ];

    const result = await agent.invoke({
        messages: [{
            role: "user",
            content: `请对这些书签进行分类，生成合理的文件夹结构：
${JSON.stringify(bookmarksData, null, 2)}

请返回 JSON 格式的分类方案，每个类别包含 folder_name 和 bookmark_ids。`
        }]
    });

    console.log("Analyze Agent 结果:", result);
    return result;
}

/**
 * 创建并使用 Execute Agent（执行代理）
 *
 * 用于：创建、移动、删除书签
 */
export async function exampleExecuteAgent() {
    const agent = await SubAgentFactory.createExecuteAgent();

    const result = await agent.invoke({
        messages: [{
            role: "user",
            content: "请将 ID 为 12, 45, 88 的书签移动到 ID 为 200 的文件夹下"
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
    const exploreAgent = await createExploreAgent();
    const analyzeAgent = await createAnalyzeAgent();
    const executeAgent = await createExecuteAgent();

    console.log("三个代理已创建:", {
        explore: exploreAgent,
        analyze: analyzeAgent,
        execute: executeAgent
    });

    return {exploreAgent, analyzeAgent, executeAgent};
}

// ============================================================================
// 示例 3: 使用 createByType 方法
// ============================================================================

/**
 * 根据类型动态创建代理
 */
export async function exampleCreateByType() {
    const agentType = "explore" as const;
    const agent = await SubAgentFactory.createByType(agentType);

    const result = await agent.invoke({
        messages: [{
            role: "user",
            content: "列出所有文件夹结构"
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
    const exploreAgent = await createSubAgent("explore");
    const analyzeAgent = await createSubAgent("analyze");
    const executeAgent = await createSubAgent("execute");

    console.log("通过 createSubAgent 创建的代理:", {
        explore: exploreAgent,
        analyze: analyzeAgent,
        execute: executeAgent
    });

    return {exploreAgent, analyzeAgent, executeAgent};
}

// ============================================================================
// 示例 5: 自定义配置覆盖
// ============================================================================

/**
 * 使用自定义配置覆盖默认设置
 */
export async function exampleCustomConfig() {
    // 使用更低的温度和自定义模型
    const agent = await SubAgentFactory.createExploreAgent({
        llmConfig: {
            model: "custom-model-name",
            temperature: 0.1  // 超低温度，更精确
        },
        systemPrompt: "你是一个专注于精确搜索的代理。请只返回事实数据，不要添加任何解释。"
    });

    const result = await agent.invoke({
        messages: [{
            role: "user",
            content: "搜索 TypeScript 相关书签"
        }]
    });

    return result;
}

// ============================================================================
// 示例 6: 在 task.ts 中集成使用
// ============================================================================

/**
 * 在 callSubagent 工具中使用 SubAgentFactory
 *
 * 这是 task.ts 中实际集成的方式
 */
export async function exampleTaskIntegration(
    subagentType: "explore" | "analyze" | "execute",
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
    explore: exampleExploreAgent,
    analyze: exampleAnalyzeAgent,
    execute: exampleExecuteAgent,
    convenience: exampleConvenienceFunctions,
    byType: exampleCreateByType,
    createSubAgent: exampleCreateSubAgent,
    customConfig: exampleCustomConfig,
    taskIntegration: exampleTaskIntegration
};
