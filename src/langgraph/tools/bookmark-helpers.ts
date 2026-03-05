/**
 * Bookmark Helper Functions
 *
 * 共享的辅助函数，供书签工具使用
 */

/**
 * 递归获取书签或文件夹的完整路径 (例如: "书签栏 > 前端开发 > React")
 * 解决大模型拿到搜索结果却不知道在哪里的 N+1 查询问题。
 */
export async function getFullPath(id: string): Promise<string> {
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
export function extractFolderStructure(nodes: chrome.bookmarks.BookmarkTreeNode[]): any[] {
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
