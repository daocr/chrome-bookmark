/**
 * LangGraph Tools Index
 *
 * Exports all available LangGraph tools for the Chrome bookmark extension
 */

// ============================================================================
// 书签操作工具 (供 SubAgent 使用)
// ============================================================================

export {
    getFolderStructure,
    searchBookmarks,
    getBookmarkChildren,
    createBookmarksBatch,
    moveBookmarksBatch,
    removeBookmarksBatch,
    removeBookmarkTreeDANGER,
    undoLastAction,
    readOnlyTools,
    executionTools,
    bookmarkTools
} from "./bookmarks";

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
