/**
 * Read-Only Bookmark Tools
 *
 * 无副作用的只读工具，适合分配给 Explore/Search Agent
 */

import {tool} from "@langchain/core/tools";
import {z} from "zod";
import {getFullPath} from "./bookmark-helpers";

/**
 * 递归统计目录数量并构建目录层级字符串
 * @param nodes 书签树节点数组
 * @param indent 缩进级别
 * @returns { count: number, structure: string } 目录数量和目录层级字符串
 */
function analyzeFolderTree(nodes: chrome.bookmarks.BookmarkTreeNode[], indent: number = 0): {
    count: number;
    structure: string
} {
    const lines: string[] = [];
    const prefix = "  ".repeat(indent);
    let count = 0;

    for (const node of nodes) {
        // 只处理文件夹（有 children 属性的节点）
        if (node.children) {
            count++;
            lines.push(`${prefix}${node.title} (id: ${node.id})`);
            // 递归处理子文件夹
            if (node.children.length > 0) {
                const result = analyzeFolderTree(node.children, indent + 1);
                count += result.count;
                lines.push(result.structure);
            }
        }
    }

    return {count, structure: lines.join("\n")};
}

export const getAllBrowserFolders = tool(
    async (_input, _config) => {
        try {
            const tree = await chrome.bookmarks.getTree();
            const {count, structure} = analyzeFolderTree(tree);

            // 将 structure 添加到 taskResultList
            const currentList = _config?.context?.taskResultList || [];
            const updatedList = [...currentList, "浏览器全部目录信息: \n" + structure];

            // 更新 context 中的 taskResultList
            if (_config?.context) {
                _config.context.taskResultList = updatedList;
            }

            return JSON.stringify({
                data: structure,
                message: `共找到 ${count} 个文件夹。请使用这些数字 ID 作为查询目标。`,
            });
        } catch (error) {
            return JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    },
    {
        name: "get_all_browser_folders",
        description: "获取所有书签文件夹的层级结构和数字 ID。当用户询问整体目录结构，或者你需要查找某个特定文件夹的准确 ID 时使用此工具。",
        schema: z.object({}),
        returnDirect: true, // 核心配置：阻断大模型过度思考
    }
);

export const searchBookmarks = tool(
    async ({query, maxResults = 20}, _config) => {
        try {
            const results = await chrome.bookmarks.search(query);

            if (results.length === 0) {
                return JSON.stringify({
                    success: true,
                    data: [],
                    count: 0,
                    message: `未找到匹配关键词 '${query}' 的书签。`,
                });
            }

            const limitedResults = results.slice(0, maxResults);

            // 为大模型加工数据：附加上完整路径
            const enrichedResults = await Promise.all(
                limitedResults.map(async (node) => {
                    const parentId = node.parentId ? String(node.parentId) : "0";
                    const fullPath = await getFullPath(parentId);
                    return {...node, folderPath: fullPath};
                })
            );

            // 将结果转换为字符串格式，增强时间戳的安全转换
            const resultsString = enrichedResults.map(item => {
                const dateAdded = item.dateAdded ? new Date(Number(item.dateAdded)).toLocaleString() : 'N/A';
                const dateGroupModified = item.dateGroupModified ? new Date(Number(item.dateGroupModified)).toLocaleString() : 'N/A';
                const url = item.url || 'N/A (文件夹)';
                return `ID: ${item.id}\n名称: ${item.title}\nURL: ${url}\n创建时间: ${dateAdded}\n最后修改: ${dateGroupModified}\n对应目录: ${item.folderPath}\n---`;
            }).join('\n');

            // 将结果字符串添加到 taskResultList
            const currentList = _config?.context?.taskResultList || [];
            const updatedList = [...currentList, `搜索关键词 '${query}' 的结果: \n${resultsString}`];

            // 更新 context 中的 taskResultList
            if (_config?.context) {
                _config.context.taskResultList = updatedList;
            }

            return JSON.stringify({
                query,
                data: resultsString,
                count: results.length,
            });
        } catch (error) {
            return JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    },
    {
        name: "search_bookmarks",
        description: "全局搜索工具。根据用户提供的关键词，在所有书签的标题和 URL 中进行模糊匹配搜索。这是查找特定书签的首选工具。",
        schema: z.object({
            query: z.string().describe("需要搜索的关键词"),
            maxResults: z.number().optional().default(20).describe("最大返回结果数，避免上下文超限"),
        }),
        returnDirect: true, // 核心配置：阻断大模型过度思考
    }
);

export const getBookmarkChildren = tool(
    async ({id}, _config) => {
        try {
            const children = await chrome.bookmarks.getChildren(id);

            if (children.length === 0) {
                return JSON.stringify({
                    success: true,
                    id,
                    data: "该目录为空。",
                    count: 0,
                });
            }

            // 将 children 信息转换为字符串格式，增加对根节点和时间戳的防御性处理
            const childrenString = await Promise.all(
                children.map(async (item) => {
                    const parentId = item.parentId ? String(item.parentId) : "0";
                    const fullPath = await getFullPath(parentId);

                    const dateAdded = item.dateAdded ? new Date(Number(item.dateAdded)).toLocaleString() : 'N/A';
                    const dateGroupModified = item.dateGroupModified ? new Date(Number(item.dateGroupModified)).toLocaleString() : 'N/A';
                    const type = item.url ? '书签' : '文件夹';
                    const url = item.url || 'N/A';

                    return `[${type}] ID: ${item.id}\n名称: ${item.title}\nURL: ${url}\n创建时间: ${dateAdded}\n最后修改: ${dateGroupModified}\n对应目录: ${fullPath}\n---`;
                })
            ).then(results => results.join('\n'));

            // 将结果字符串添加到 taskResultList
            const currentList = _config?.context?.taskResultList || [];
            const updatedList = [...currentList, `目录 ID '${id}' 的子项内容: \n${childrenString}`];

            // 更新 context 中的 taskResultList
            if (_config?.context) {
                _config.context.taskResultList = updatedList;
            }

            return JSON.stringify({
                success: true,
                id,
                data: childrenString,
                count: children.length,
            });
        } catch (error) {
            return JSON.stringify({
                success: false,
                error: `获取子节点失败。请确认 ID '${id}' 是否正确。错误信息: ${String(error)}`,
            });
        }
    },
    {
        name: "get_bookmark_children",
        description: "获取指定文件夹下的直属内容。必须传入严格的数字 ID（如 '1', '15'）。仅当用户明确要求查看某个特定目录里的内容时使用。",
        schema: z.object({
            id: z.string()
                .regex(/^\d+$/, "参数错误：ID 必须是严格的纯数字字符串（例如 '1', '15'）。严禁传入文件夹名称或包含字母！")
                .describe("目标文件夹的纯数字 ID"),
        }),
        returnDirect: true, // 核心配置：阻断大模型过度思考
    }
);

// 派发给负责搜索、检索信息的 Agent (无副作用)
export const readOnlyTools = [
    getAllBrowserFolders,
    searchBookmarks,
    getBookmarkChildren
];