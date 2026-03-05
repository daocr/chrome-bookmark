/**
 * Execute Agent Context Schema
 *
 * 用于 Execute Agent 的上下文数据结构定义
 * Execute Agent 负责书签的物理修改操作（增删改移）
 */

import {z} from "zod";

/**
 * Execute Agent 上下文 Schema
 *
 * 定义 Execute Agent 运行时需要的上下文数据
 * 可用于传递撤销栈状态、操作限制、目标目录等配置
 */
export const executeContextSchema = z.object({
    // TODO: 根据实际需求添加字段
    // 示例字段：
    // defaultTargetFolderId: z.string().optional().describe("默认目标文件夹 ID"),
    // undoStackSize: z.number().optional().describe("当前撤销栈大小"),
    // operationLimit: z.number().optional().describe("单次操作数量限制"),
    // dryRun: z.boolean().optional().describe("是否为演练模式（不实际执行）"),
});

export type ExecuteContext = z.infer<typeof executeContextSchema>;
