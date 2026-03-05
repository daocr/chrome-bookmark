/**
 * Bookmark Tools Grouping
 *
 * 将书签工具按权限级别分组，便于分配给不同的 Agent
 */

import {readOnlyTools as _readOnlyTools} from './bookmark-read-only-tools';
import {executionTools as _executionTools} from './bookmark-write-tools';

// Re-export for convenience
export const readOnlyTools = _readOnlyTools;
export const executionTools = _executionTools;

// 向后兼容导出
export const bookmarkTools = [...readOnlyTools, ...executionTools];
