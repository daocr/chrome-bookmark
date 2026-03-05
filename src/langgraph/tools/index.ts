/**
 * LangGraph Tools Index
 *
 * Exports all available LangGraph tools for the Chrome bookmark extension
 */

// ============================================================================
// 书签操作工具 (供 SubAgent 使用)
// ============================================================================

// 单个工具导出 - Read-Only Tools
export {
    getAllBrowserFolders,
    searchBookmarks,
    getBookmarkChildren
} from "./bookmark-read-only-tools";

// 单个工具导出 - Write Tools
export {
    createBookmarksBatch,
    moveBookmarksBatch,
    removeBookmarksBatch,
    removeBookmarkTreeDANGER
} from "./bookmark-write-tools";

// 工具分组导出
export {
    readOnlyTools,
    executionTools,
    bookmarkTools
} from "./bookmark-groups";

// ============================================================================
// 主代理工具 (供 Primary Agent 使用)
// ============================================================================


// 导入用于组合工具集
import {callSubagent as _callSubagent} from "./task";
import {askQuestion as _askQuestion} from "./interaction-tools";
import {writeTodo as _writeTodo, readTodo as _readTodo} from "./todo-tools";
import {planEnter as _planEnter, planExit as _planExit} from "./plan-tools";

// 主代理工具集 (Primary Agent 使用的所有工具)
export const primaryAgentTools = [
    _callSubagent,
    _askQuestion,
    _writeTodo,
    _readTodo,
    _planEnter,
    _planExit
];

// Re-export utility functions
export * from "../utils/bookmarks";
