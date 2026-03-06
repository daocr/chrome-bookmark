/**
 * Read-Only Bookmark Tools
 *
 * 无副作用的只读工具，用于探索和搜索书签。
 */

import {tool} from "@langchain/core/tools";
import {z} from "zod";
import {getFullPath} from "./bookmark-helpers";

/**
 * 简化书签树结构，仅保留核心字段以节省 Token 并便于模型理解
 */
function simplifyBookmarkTree(nodes: chrome.bookmarks.BookmarkTreeNode[]): {
    folderCount: number;
    bookmarkCount: number;
    tree: any[]
} {
    let folderCount = 0;
    let bookmarkCount = 0;
    
    const tree = nodes.map((node: chrome.bookmarks.BookmarkTreeNode) => {
        const isFolder = !node.url;
        const simplified: any = {
            id: node.id,
            title: node.title || (node.id === "0" ? "Root" : "Untitled")
        };

        if (isFolder) {
            // 排除根节点自身的统计
            if (node.id !== "0") folderCount++;
            if (node.children && node.children.length > 0) {
                const result = simplifyBookmarkTree(node.children);
                folderCount += result.folderCount;
                bookmarkCount += result.bookmarkCount;
                simplified.type = "folder";
                simplified.children = result.tree;
            } else {
                simplified.type = "folder";
                simplified.children = [];
            }
        } else {
            bookmarkCount++;
            simplified.type = "bookmark";
            simplified.url = node.url;
        }
        return simplified;
    });

    return {folderCount, bookmarkCount, tree};
}

export const getAllBrowserBookmarks = tool(
    async (_input, _config) => {
        try {
            const tree = await chrome.bookmarks.getTree();
            const {folderCount, bookmarkCount, tree: simplifiedTree} = simplifyBookmarkTree(tree);

            const result = {
                summary: {
                    totalFolders: folderCount,
                    totalBookmarks: bookmarkCount,
                    message: "提示: id 为数字字符串，请使用该 ID 进行后续操作。"
                },
                bookmarks: (simplifiedTree[0] && simplifiedTree[0].children) ? simplifiedTree[0].children : simplifiedTree
            };

            return JSON.stringify(result, null, 2);
        } catch (error) {
            return JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    },
    {
        name: "get_all_bookmarks",
        description: "获取浏览器中所有的书签和文件夹完整结构（JSON 格式）。当你需要了解全局布局、寻找特定位置或准备进行大规模整理时使用。返回包含层级关系、名称、ID 和 URL 的结构化数据。",
        schema: z.object({})
    }
);

export const searchBookmarks = tool(
    async ({query, maxResults = 50}, _config) => {
        try {
            // 使用 unknown 中转解决类型不重叠问题
            const results = (await chrome.bookmarks.search(query)) as unknown as chrome.bookmarks.BookmarkTreeNode[];

            if (!results || results.length === 0) {
                return JSON.stringify({
                    message: `未找到匹配关键词 "${query}" 的结果。`,
                    results: []
                });
            }

            const limitedResults = results.slice(0, maxResults);

            const enrichedResults = await Promise.all(
                limitedResults.map(async (node: chrome.bookmarks.BookmarkTreeNode) => {
                    const parentId = node.parentId ? String(node.parentId) : "0";
                    const path = await getFullPath(parentId);
                    return {
                        id: node.id,
                        title: node.title,
                        url: node.url || null,
                        type: node.url ? "bookmark" : "folder",
                        path: path
                    };
                })
            );

            return JSON.stringify({
                query,
                totalMatches: results.length,
                displayedCount: enrichedResults.length,
                results: enrichedResults
            }, null, 2);
        } catch (error) {
            return JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    },
    {
        name: "search_bookmarks",
        description: "全局搜索书签。支持根据标题或 URL 关键词查找（JSON 格式）。当你只知道名称但不知道具体位置时，这是最高效的工具。返回包含 ID、完整路径和 URL 的结构化信息。",
        schema: z.object({
            query: z.string().describe("搜索关键词（标题或 URL）"),
            maxResults: z.number().optional().default(50).describe("最大返回结果数，默认 50"),
        })
    }
);

export const getBookmarksById = tool(
    async ({ids}, _config) => {
        if (!ids || ids.length === 0) {
            return JSON.stringify({
                message: "未提供任何 ID。",
                results: []
            });
        }
        try {
            // 解决 TS2345: Argument of type string[] is not assignable to parameter of type string | [string, ...string[]]
            // 通过前面的 length 检查确保了 ids 不为空
            const results = (await chrome.bookmarks.get(ids as [string, ...string[]])) as unknown as chrome.bookmarks.BookmarkTreeNode[];

            if (!results || results.length === 0) {
                return JSON.stringify({
                    message: `未找到 ID 为 [${ids.join(", ")}] 的书签或文件夹。`,
                    results: []
                });
            }

            const enrichedResults = await Promise.all(
                results.map(async (node: chrome.bookmarks.BookmarkTreeNode) => {
                    const parentId = node.parentId ? String(node.parentId) : "0";
                    const path = await getFullPath(parentId);
                    return {
                        id: node.id,
                        title: node.title,
                        url: node.url || null,
                        type: node.url ? "bookmark" : "folder",
                        path: path
                    };
                })
            );

            return JSON.stringify({
                requestedIds: ids,
                foundCount: enrichedResults.length,
                results: enrichedResults
            }, null, 2);
        } catch (error) {
            return JSON.stringify({
                success: false,
                error: `查询 ID 失败。请确保 ID [${ids.join(", ")}] 是正确的数字字符串。错误: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    },
    {
        name: "get_bookmarks_by_id",
        description: "根据一个或多个数字 ID 精确获取书签或文件夹的详细信息（JSON 格式）。当你已经有 ID 并需要确认其当前的标题、URL 或所在路径时使用。",
        schema: z.object({
            ids: z.array(z.string()).describe("需要查询的数字 ID 数组（例如 ['1', '105']）"),
        })
    }
);

// 派发给负责搜索、检索信息的 Agent (无副作用)
export const readOnlyTools = [
    getAllBrowserBookmarks,
    searchBookmarks,
    getBookmarksById
];
