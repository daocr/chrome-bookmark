/**
 * Chrome Bookmarks LangGraph Tools (Optimized for LLM Subagents)
 *
 * 这套工具专门为大语言模型设计，包含了防止幻觉的强类型描述、
 * 批量操作支持、上下文裁剪、命令堆栈撤销（Undo Stack）以及反爬虫机制。
 */

import {tool} from "@langchain/core/tools";
import {z} from "zod";
import {UndoStack, UndoAction} from './undo-stack';

// ============================================================================
// 辅助函数 (Helper Functions)
// ============================================================================

/**
 * 递归获取书签或文件夹的完整路径 (例如: "书签栏 > 前端开发 > React")
 * 解决大模型拿到搜索结果却不知道在哪里的 N+1 查询问题。
 */
async function getFullPath(id: string): Promise<string> {
    let currentId = id;
    let path = "";
    try {
        while (currentId) {
            const nodes = await chrome.bookmarks.get(currentId);
            if (!nodes || nodes.length === 0) break;
            const node = nodes[0];
            // 跳过根节点（通常 title 为空）
            if (node.title) {
                path = path ? `${node.title} > ${path}` : node.title;
            }
            currentId = node.parentId || "";
        }
    } catch (e) {
        // 忽略找不到父节点的错误
    }
    return path || "根目录";
}

/**
 * 递归裁剪书签树，仅保留文件夹层级
 * 解决大模型请求完整书签树导致 Token 爆炸的问题。
 */
function extractFolderStructure(nodes: chrome.bookmarks.BookmarkTreeNode[]): any[] {
    const folders: any[] = [];
    for (const node of nodes) {
        // 如果没有 url，说明它是文件夹
        if (!node.url) {
            const folder: any = {id: node.id, title: node.title || "根目录"};
            if (node.children && node.children.length > 0) {
                folder.children = extractFolderStructure(node.children);
            }
            folders.push(folder);
        }
    }
    return folders;
}

// ============================================================================
// Read-Only 工具 (适合分配给 Explore/Search Agent)
// ============================================================================

export const getFolderStructure = tool(
    async (_input, _config) => {
        try {
            const tree = await chrome.bookmarks.getTree();
            const folderStructure = extractFolderStructure(tree);
            return JSON.stringify({
                success: true,
                data: folderStructure,
                message: `Successfully retrieved the folder skeleton. Use these numeric IDs for target parentId.`,
            });
        } catch (error) {
            return JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    },
    {
        name: "get_folder_structure",
        description: `Get the skeleton structure of all bookmark folders. 
        CRITICAL WARNING: This returns ONLY folders, not bookmarks. Use this to find the correct numeric 'id' of a folder. DO NOT use this tool as a starting point to manually crawl or search for bookmarks item by item.`,
        schema: z.object({}),
    }
);

export const searchBookmarks = tool(
    async ({query, maxResults = 20}, _config) => {
        try {
            const results = await chrome.bookmarks.search(query);

            // 【防止死循环的核心】：搜不到时，强硬拒绝模型后续的手动查找尝试
            if (results.length === 0) {
                return JSON.stringify({
                    success: true,
                    data: [],
                    count: 0,
                    message: `Found 0 items for keyword '${query}'. CRITICAL: DO NOT use get_folder_structure or get_bookmark_children to manually search. Inform the user that the bookmark is not found.`,
                });
            }

            const limitedResults = results.slice(0, maxResults);

            // 为大模型加工数据：附加上完整路径，避免大模型再去一个个查 parentId
            const enrichedResults = await Promise.all(
                limitedResults.map(async (node) => {
                    const fullPath = await getFullPath(node.parentId || "");
                    return {...node, folderPath: fullPath};
                })
            );

            return JSON.stringify({
                success: true,
                data: enrichedResults,
                count: results.length,
                message: `Found ${results.length} items. Showing top ${limitedResults.length}.`,
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
        description: `Search for bookmarks by keyword in title or URL. Returns enriched data including the folder path.`,
        schema: z.object({
            query: z.string().describe("The search query"),
            maxResults: z.number().optional().default(20).describe("Max results to avoid token limits"),
        }),
    }
);

export const getBookmarkChildren = tool(
    async ({id}, _config) => {
        try {
            const children = await chrome.bookmarks.getChildren(id);
            return JSON.stringify({success: true, data: children, count: children.length});
        } catch (error) {
            return JSON.stringify({success: false, error: String(error)});
        }
    },
    {
        name: "get_bookmark_children",
        description: `Get all items (folders and bookmarks) directly inside a specific folder.
        CRITICAL WARNING: NEVER use this tool in a loop to manually search or crawl for a bookmark. ONLY use this when the user EXPLICITLY asks to see the contents of one specific folder.`,
        schema: z.object({
            id: z.string().describe("The strictly NUMERIC ID of the folder (e.g., '1', '15'). Do NOT pass folder names like 'Tech'."),
        }),
    }
);

// ============================================================================
// Write/Mutate 工具 (适合分配给 Execution Agent，需严格控制权限)
// ============================================================================

export const createBookmarksBatch = tool(
    async ({items}, _config) => {
        try {
            const results = [];
            const undoActions: UndoAction[] = [];

            for (const item of items) {
                const res = await chrome.bookmarks.create({
                    title: item.title,
                    url: item.url,
                    parentId: item.parentId,
                });
                results.push(res);

                // 逆操作：删除刚刚创建的新书签
                undoActions.push({type: "DELETE", payload: {id: res.id}});
            }

            // 操作成功，压入撤销栈
            UndoStack.push({actions: undoActions, description: `创建了 ${items.length} 个书签/文件夹`});

            return JSON.stringify({success: true, data: results, count: results.length});
        } catch (error) {
            return JSON.stringify({success: false, error: String(error)});
        }
    },
    {
        name: "create_bookmarks_batch",
        description: `Create one or multiple bookmarks/folders. If 'url' is omitted, it creates a folder.`,
        schema: z.object({
            items: z.array(z.object({
                title: z.string().describe("Name of the bookmark or folder"),
                url: z.string().optional().describe("URL (omit to create a folder)"),
                parentId: z.string().optional().describe("The strictly NUMERIC ID of the parent folder (e.g. '1'). NEVER use names."),
            })).describe("List of items to create"),
        }),
    }
);

export const moveBookmarksBatch = tool(
    async ({ids, targetParentId}, _config) => {
        try {
            const undoActions: UndoAction[] = [];

            // 1. 在移动前，必须先获取它们当前的状态（位置和父级）
            for (const id of ids) {
                const nodes = await chrome.bookmarks.get(id);
                if (nodes && nodes.length > 0) {
                    const node = nodes[0];
                    // 逆操作：移回原来的位置
                    undoActions.push({
                        type: "MOVE",
                        payload: {id: node.id, parentId: node.parentId!, index: node.index!}
                    });
                }
            }

            // 2. 执行实际的移动
            for (const id of ids) {
                await chrome.bookmarks.move(id, {parentId: targetParentId});
            }

            // 3. 压栈
            UndoStack.push({actions: undoActions, description: `移动了 ${ids.length} 个书签`});

            return JSON.stringify({success: true, message: `Moved ${ids.length} items successfully.`});
        } catch (error) {
            return JSON.stringify({success: false, error: String(error)});
        }
    },
    {
        name: "move_bookmarks_batch",
        description: `Move multiple bookmarks or folders into a new destination folder.`,
        schema: z.object({
            ids: z.array(z.string()).describe("Array of NUMERIC IDs of the items to move"),
            targetParentId: z.string().describe("The NUMERIC ID of the destination folder. NEVER use folder names here."),
        }),
    }
);

export const removeBookmarksBatch = tool(
    async ({ids}, _config) => {
        try {
            const undoActions: UndoAction[] = [];

            // 1. 在删除前，必须先获取它们的完整数据，以便能够重新创建
            for (const id of ids) {
                const nodes = await chrome.bookmarks.get(id);
                if (nodes && nodes.length > 0) {
                    const node = nodes[0];
                    // 逆操作：使用原数据重新创建
                    undoActions.push({
                        type: "CREATE",
                        payload: {
                            parentId: node.parentId || '1',
                            title: node.title,
                            url: node.url,
                            index: node.index
                        }
                    });
                }
            }

            // 2. 执行实际的删除
            let successCount = 0;
            for (const id of ids) {
                await chrome.bookmarks.remove(id);
                successCount++;
            }

            // 3. 压栈
            UndoStack.push({actions: undoActions, description: `删除了 ${successCount} 个书签`});

            return JSON.stringify({success: true, message: `Removed ${successCount} items.`});
        } catch (error) {
            return JSON.stringify({success: false, error: String(error)});
        }
    },
    {
        name: "remove_bookmarks_batch",
        description: `Delete one or multiple bookmarks. Note: Cannot delete non-empty folders.`,
        schema: z.object({
            ids: z.array(z.string()).describe("Array of NUMERIC IDs to delete"),
        }),
    }
);

export const removeBookmarkTreeDANGER = tool(
    async ({id}, _config) => {
        try {
            await chrome.bookmarks.removeTree(id);
            return JSON.stringify({success: true, message: `Folder and ALL its contents destroyed.`});
        } catch (error) {
            return JSON.stringify({success: false, error: String(error)});
        }
    },
    {
        name: "remove_bookmark_tree_danger",
        description: `DANGER: Destructive action. Recursively deletes a folder AND ALL its contents permanently. Ensure you have user permission.`,
        schema: z.object({
            id: z.string().describe("The NUMERIC ID of the folder to nuke"),
        }),
    }
);

export const undoLastAction = tool(
    async (_input, _config) => {
        const undoneTask = await UndoStack.popAndExecute();
        if (undoneTask) {
            return JSON.stringify({
                success: true,
                message: `Successfully undid the last action: ${undoneTask}.`
            });
        } else {
            return JSON.stringify({
                success: false,
                error: "Undo stack is empty. Nothing to undo."
            });
        }
    },
    {
        name: "undo_last_action",
        description: `Revert the immediate last destructive operation (like move or delete). Call this if the user says they made a mistake or want to revert.`,
        schema: z.object({}),
    }
);

// ============================================================================
// 导出分组 (Export Grouping for Agents)
// ============================================================================

// 派发给负责搜索、检索信息的 Agent (无副作用)
export const readOnlyTools = [
    getFolderStructure,
    searchBookmarks,
    getBookmarkChildren
];

// 派发给负责执行物理操作的 Agent (需严格审核)
export const executionTools = [
    createBookmarksBatch,
    moveBookmarksBatch,
    removeBookmarksBatch,
    removeBookmarkTreeDANGER,
    undoLastAction // 已加入到执行工具组
];

// 向后兼容导出
export const bookmarkTools = [...readOnlyTools, ...executionTools];