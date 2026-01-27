/**
 * Chrome Bookmarks LangGraph Tools
 *
 * Tools for managing Chrome bookmarks using LangGraph
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Type definitions for Chrome Bookmarks API
export interface BookmarkTreeNode {
  id: string;
  parentId?: string;
  index?: number;
  title: string;
  url?: string;
  dateAdded?: number;
  dateGroupModified?: number;
  dateLastUsed?: number;
  children?: BookmarkTreeNode[];
  unmodifiable?: "managed";
}

/**
 * 1. 新增书签 (Add Bookmark)
 * Creates a new bookmark or folder
 */
export const createBookmark = tool(
  async ({ title, url, parentId, index }, _config) => {
    try {
      const result = await chrome.bookmarks.create({
        title,
        url,
        parentId,
        index,
      });

      return JSON.stringify({
        success: true,
        data: result,
        message: `Bookmark "${title}" created successfully`,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
  {
    name: "create_bookmark",
    description: `Create a new bookmark or folder in Chrome bookmarks.

    If url is provided, creates a bookmark. If url is omitted, creates a folder.

    Args:
    - title: The title of the bookmark/folder
    - url: (optional) The URL for the bookmark. Omit to create a folder
    - parentId: (optional) The ID of the parent folder. Defaults to "Other Bookmarks"
    - index: (optional) The 0-based position within the parent folder`,
    schema: z.object({
      title: z.string().describe("The title of the bookmark or folder"),
      url: z.string().optional().describe("The URL of the bookmark (omit to create a folder)"),
      parentId: z.string().optional().describe("The parent folder ID"),
      index: z.number().optional().describe("The position within the parent folder"),
    }),
  }
);

/**
 * 2. 移动书签 (Move Bookmark)
 * Moves a bookmark to a different location
 */
export const moveBookmark = tool(
  async ({ id, parentId, index }, _config) => {
    try {
      const result = await chrome.bookmarks.move(id, {
        parentId,
        index,
      });

      return JSON.stringify({
        success: true,
        data: result,
        message: `Bookmark moved successfully`,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
  {
    name: "move_bookmark",
    description: `Move a bookmark or folder to a different location in Chrome bookmarks.

    Args:
    - id: The ID of the bookmark/folder to move
    - parentId: (optional) The new parent folder ID
    - index: (optional) The new 0-based position within the parent folder`,
    schema: z.object({
      id: z.string().describe("The ID of the bookmark or folder to move"),
      parentId: z.string().optional().describe("The new parent folder ID"),
      index: z.number().optional().describe("The new position within the parent folder"),
    }),
  }
);

/**
 * 3. 删除书签 (Delete Bookmark)
 * Removes a bookmark or empty folder
 */
export const removeBookmark = tool(
  async ({ id }, _config) => {
    try {
      await chrome.bookmarks.remove(id);

      return JSON.stringify({
        success: true,
        message: `Bookmark removed successfully`,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
  {
    name: "remove_bookmark",
    description: `Remove a bookmark or empty folder from Chrome bookmarks.

    Note: To remove a folder with all its children, use remove_bookmark_tree instead.

    Args:
    - id: The ID of the bookmark/folder to remove`,
    schema: z.object({
      id: z.string().describe("The ID of the bookmark or folder to remove"),
    }),
  }
);

/**
 * 3.1 删除书签树 (Delete Bookmark Tree)
 * Recursively removes a bookmark folder and all its children
 */
export const removeBookmarkTree = tool(
  async ({ id }, _config) => {
    try {
      await chrome.bookmarks.removeTree(id);

      return JSON.stringify({
        success: true,
        message: `Bookmark tree removed successfully`,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
  {
    name: "remove_bookmark_tree",
    description: `Recursively remove a bookmark folder and all its children.

    Use this to delete a folder that contains bookmarks.

    Args:
    - id: The ID of the folder to remove with all its children`,
    schema: z.object({
      id: z.string().describe("The ID of the folder to remove with all its children"),
    }),
  }
);

/**
 * 4. 更新书签 (Update Bookmark)
 * Updates the title and/or URL of a bookmark
 */
export const updateBookmark = tool(
  async ({ id, title, url }, _config) => {
    try {
      const changes: { title?: string; url?: string } = {};
      if (title !== undefined) changes.title = title;
      if (url !== undefined) changes.url = url;

      const result = await chrome.bookmarks.update(id, changes);

      return JSON.stringify({
        success: true,
        data: result,
        message: `Bookmark updated successfully`,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
  {
    name: "update_bookmark",
    description: `Update the title and/or URL of a bookmark or folder.

    Only specify the properties you want to change.

    Args:
    - id: The ID of the bookmark/folder to update
    - title: (optional) The new title
    - url: (optional) The new URL (not applicable for folders)`,
    schema: z.object({
      id: z.string().describe("The ID of the bookmark or folder to update"),
      title: z.string().optional().describe("The new title"),
      url: z.string().optional().describe("The new URL"),
    }),
  }
);

/**
 * 5. 获取子节点 (Get Children)
 * Retrieves the children of a specified bookmark folder
 */
export const getBookmarkChildren = tool(
  async ({ id }, _config) => {
    try {
      const children = await chrome.bookmarks.getChildren(id);

      return JSON.stringify({
        success: true,
        data: children,
        count: children.length,
        message: `Found ${children.length} children`,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
  {
    name: "get_bookmark_children",
    description: `Get the children of a specified bookmark folder in Chrome.

    Args:
    - id: The ID of the folder to get children from`,
    schema: z.object({
      id: z.string().describe("The ID of the folder to get children from"),
    }),
  }
);

/**
 * Additional utility tools
 */

/**
 * 获取书签详情 (Get Bookmark Details)
 * Retrieves details of specific bookmark(s) by ID
 */
export const getBookmark = tool(
  async ({ id }, _config) => {
    try {
      const result = await chrome.bookmarks.get(id);

      return JSON.stringify({
        success: true,
        data: result,
        message: `Bookmark details retrieved`,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
  {
    name: "get_bookmark",
    description: `Get details of a specific bookmark or folder by ID.

    Args:
    - id: The ID of the bookmark/folder to retrieve`,
    schema: z.object({
      id: z.string().describe("The ID of the bookmark or folder to retrieve"),
    }),
  }
);

/**
 * 获取整个书签树 (Get Bookmarks Tree)
 * Retrieves the entire bookmarks hierarchy
 */
export const getBookmarkTree = tool(
  async (_input, _config) => {
    try {
      const tree = await chrome.bookmarks.getTree();

      return JSON.stringify({
        success: true,
        data: tree,
        message: `Bookmarks tree retrieved`,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
  {
    name: "get_bookmark_tree",
    description: `Get the entire Chrome bookmarks hierarchy.

    This returns the complete bookmark tree structure including all folders and bookmarks.

    No arguments required.`,
    schema: z.object({}),
  }
);

/**
 * 搜索书签 (Search Bookmarks)
 * Searches for bookmarks matching the query
 */
export const searchBookmarks = tool(
  async ({ query }, _config) => {
    try {
      const results = await chrome.bookmarks.search(query);

      return JSON.stringify({
        success: true,
        data: results,
        count: results.length,
        message: `Found ${results.length} bookmarks matching "${query}"`,
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
    description: `Search for bookmarks in Chrome matching a query string.

    The query is matched against bookmark URLs and titles.

    Args:
    - query: The search query string`,
    schema: z.object({
      query: z.string().describe("The search query to match against bookmark titles and URLs"),
    }),
  }
);

/**
 * 获取最近的书签 (Get Recent Bookmarks)
 * Retrieves recently added bookmarks
 */
export const getRecentBookmarks = tool(
  async ({ numberOfItems = 10 }, _config) => {
    try {
      const results = await chrome.bookmarks.getRecent(numberOfItems);

      return JSON.stringify({
        success: true,
        data: results,
        count: results.length,
        message: `Retrieved ${results.length} recent bookmarks`,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
  {
    name: "get_recent_bookmarks",
    description: `Get recently added bookmarks from Chrome.

    Args:
    - numberOfItems: The maximum number of items to return (default: 10)`,
    schema: z.object({
      numberOfItems: z.number().default(10).describe("Maximum number of recent bookmarks to retrieve"),
    }),
  }
);

// Export all tools as an array
export const bookmarkTools = [
  createBookmark,
  moveBookmark,
  removeBookmark,
  removeBookmarkTree,
  updateBookmark,
  getBookmarkChildren,
  getBookmark,
  getBookmarkTree,
  searchBookmarks,
  getRecentBookmarks,
];
