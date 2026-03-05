/**
 * Explore Agent Context Schema
 *
 * 用于 Explore Agent 的上下文数据结构定义
 * Explore Agent 负责书签检索与探索（只读操作）
 */

import {z} from "zod";

/**
 * Explore Agent 上下文 Schema
 *
 * 定义 Explore Agent 运行时需要的上下文数据
 * 可用于传递搜索限制、用户偏好、目录配置等
 */
export const exploreContextSchema = z.object({
    /**
     * 任务结果列表集合
     * 用于存储之前的搜索结果，供后续参考
     */
    taskResultList: z.array(z.string()).optional().describe("任务结果列表集合"),
});

export type ExploreContext = z.infer<typeof exploreContextSchema>;
