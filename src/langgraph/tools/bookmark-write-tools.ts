/**
 * Write/Mutate Bookmark Tools
 *
 * 有副作用的写入/修改工具，适合分配给 Execution Agent，需严格控制权限
 */

import {tool} from "@langchain/core/tools";
import {z} from "zod";

export const createBookmarksBatch = tool(
    async ({items}, _config) => {
        try {
            const results = [];

            for (const item of items) {
                const res = await chrome.bookmarks.create({
                    title: item.title,
                    url: item.url,
                    parentId: item.parentId,
                });
                results.push(res);
            }

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
            for (const id of ids) {
                await chrome.bookmarks.move(id, {parentId: targetParentId});
            }

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

export const updateBookmarksBatch = tool(
    async ({items}, _config) => {
        try {
            const results = [];
            for (const item of items) {
                const res = await chrome.bookmarks.update(item.id, {
                    title: item.title,
                    url: item.url,
                });
                results.push(res);
            }
            return JSON.stringify({success: true, data: results, count: results.length});
        } catch (error) {
            return JSON.stringify({success: false, error: String(error)});
        }
    },
    {
        name: "update_bookmarks_batch",
        description: `Update title and/or URL of one or multiple existing bookmarks or folders.`,
        schema: z.object({
            items: z.array(z.object({
                id: z.string().describe("The NUMERIC ID of the bookmark or folder to update"),
                title: z.string().optional().describe("New title for the bookmark or folder"),
                url: z.string().optional().describe("New URL for the bookmark (ignored for folders)"),
            })).describe("List of items to update"),
        }),
    }
);

export const removeBookmarksBatch = tool(
    async ({ids}, _config) => {
        try {
            let successCount = 0;
            for (const id of ids) {
                await chrome.bookmarks.remove(id);
                successCount++;
            }

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

// 派发给负责执行物理操作的 Agent (需严格审核)
export const executionTools = [
    createBookmarksBatch,
    moveBookmarksBatch,
    updateBookmarksBatch,
    removeBookmarksBatch,
    removeBookmarkTreeDANGER
];
