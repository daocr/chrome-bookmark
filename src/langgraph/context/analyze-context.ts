/**
 * Analyze Agent Context Schema
 *
 * 用于 Analyze Agent 的上下文数据结构定义
 * Analyze Agent 负责书签数据分析与分类建议（无副作用）
 */

import {z} from "zod";

/**
 * Analyze Agent 上下文 Schema
 *
 * 定义 Analyze Agent 运行时需要的上下文数据
 * 可用于传递分类风格、分析深度、输出格式等配置
 */
export const analyzeContextSchema = z.object({
    // TODO: 根据实际需求添加字段
    // 示例字段：
    // categoryStyle: z.enum(["concise", "detailed"]).optional().describe("分类名称风格：简洁或详细"),
    // maxCategories: z.number().optional().describe("最大分类数量"),
    // outputFormat: z.enum(["json", "markdown"]).optional().describe("输出格式"),
    // analysisDepth: z.enum(["shallow", "deep"]).optional().describe("分析深度"),
});

export type AnalyzeContext = z.infer<typeof analyzeContextSchema>;
