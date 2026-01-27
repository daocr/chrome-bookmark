/**
 * Chrome Bookmarks Utility Functions
 *
 * Helper functions for Chrome bookmarks operations
 */

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
 * Get the root node ID for bookmarks
 */
export const ROOT_NODE_ID = "0";

/**
 * Find a bookmark folder by title
 */
export async function findFolderByTitle(title: string): Promise<BookmarkTreeNode | null> {
  const tree = await chrome.bookmarks.getTree();

  function search(nodes: BookmarkTreeNode[]): BookmarkTreeNode | null {

    for (const node of nodes) {
      if (node.title === title && !node.url) {
        return node;
      }
      if (node.children) {
        const found = search(node.children);
        if (found) return found;
      }
    }
    return null;
  }

  return search(tree);
}

/**
 * Get or create a folder path
 * Creates the folder structure if it doesn't exist
 */
export async function getOrCreateFolder(path: string[]): Promise<BookmarkTreeNode | null> {
  const tree = await chrome.bookmarks.getTree();

  // Start from the root
  let currentNode = tree[0];
  if (!currentNode) return null;

  for (const folderName of path) {
    if (!currentNode.children) {
      currentNode.children = [];
    }

    let child = currentNode.children.find(c => c.title === folderName && !c.url);

    if (!child) {
      // Create the folder
      child = await chrome.bookmarks.create({
        parentId: currentNode.id,
        title: folderName,
      });
    }

    currentNode = child;
  }

  return currentNode;
}

/**
 * Find bookmarks by URL
 */
export async function findBookmarksByUrl(url: string): Promise<BookmarkTreeNode[]> {
  const results = await chrome.bookmarks.search({ url });
  return results;
}

/**
 * Flatten a bookmark tree into a single array
 */
export function flattenBookmarkTree(nodes: BookmarkTreeNode[]): BookmarkTreeNode[] {
  const result: BookmarkTreeNode[] = [];

  function traverse(items: BookmarkTreeNode[]) {
    for (const item of items) {
      result.push(item);
      if (item.children) {
        traverse(item.children);
      }
    }
  }

  traverse(nodes);
  return result;
}

/**
 * Get all bookmarks (not folders) from the tree
 */
export async function getAllBookmarks(): Promise<BookmarkTreeNode[]> {
  const tree = await chrome.bookmarks.getTree();
  const allNodes = flattenBookmarkTree(tree);
  return allNodes.filter(node => node.url !== undefined);
}

/**
 * Get all folders from the tree
 */
export async function getAllFolders(): Promise<BookmarkTreeNode[]> {
  const tree = await chrome.bookmarks.getTree();
  const allNodes = flattenBookmarkTree(tree);
  return allNodes.filter(node => node.url === undefined);
}

/**
 * Check if a node is a folder
 */
export function isFolder(node: BookmarkTreeNode): boolean {
  return node.url === undefined;
}

/**
 * Check if a node is modifiable (not managed by system)
 */
export function isModifiable(node: BookmarkTreeNode): boolean {
  return node.unmodifiable !== "managed";
}

/**
 * Format a bookmark for display
 */
export function formatBookmark(node: BookmarkTreeNode): string {
  if (node.url) {
    return `🔗 ${node.title} - ${node.url}`;
  }
  return `📁 ${node.title}`;
}

/**
 * Get bookmark stats
 */
export async function getBookmarkStats(): Promise<{
  totalBookmarks: number;
  totalFolders: number;
  recentBookmarks: number;
}> {
  const tree = await chrome.bookmarks.getTree();
  const allNodes = flattenBookmarkTree(tree);

  const bookmarks = allNodes.filter(n => n.url);
  const folders = allNodes.filter(n => !n.url);

  // Count bookmarks added in the last 30 days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentBookmarks = bookmarks.filter(
    b => b.dateAdded && b.dateAdded > thirtyDaysAgo
  ).length;

  return {
    totalBookmarks: bookmarks.length,
    totalFolders: folders.length,
    recentBookmarks,
  };
}
