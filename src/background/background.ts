/**
 * Background Service Worker
 * 处理右键菜单快速收藏，静默调用 AI Agent 智能分类
 */

// 1. 安装时创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "quick-bookmark",
        title: "快速收藏到合适目录",
        contexts: ["page"]
    });
    console.log("Quick Bookmark context menu created.");
});

// 2. 点击侧边栏图标打开侧边栏
chrome.action.onClicked.addListener(async (tab) => {
    if (tab?.windowId) {
        await chrome.sidePanel.open({windowId: tab.windowId});
    }
});

// 3. 处理右键菜单点击 - 静默调用 AI Agent
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    console.log("=== Quick Bookmark Clicked ===");
    console.log("Menu item ID:", info.menuItemId);

    if (info.menuItemId === "quick-bookmark") {
        console.log("Processing quick-bookmark...");

        // 检查 tab 是否存在
        if (!tab) {
            console.error("No tab available");
            return;
        }

        const url = tab.url || "";
        const title = tab.title || "未命名页面";

        console.log("URL:", url);
        console.log("Title:", title);

        // 检查 URL 是否有效
        if (!url || url.startsWith("chrome://")) {
            console.warn("Invalid URL for bookmarking");
            showNotification("无法收藏", "无法收藏此页面");
            return;
        }

        // 显示处理中通知（不使用 icon）
        showNotification("正在智能分类...", `正在分析 "${title}" 应该放入哪个文件夹`);

        try {
            console.log("Starting AI analysis...");
            // 调用 AI Agent 智能分析
            const result = await analyzeAndBookmark(url, title);
            console.log("Analysis result:", result);

            if (result.success) {
                showNotification("快速收藏成功", result.message || `已添加到 "${result.folderName}"`);
            } else {
                console.error("Bookmark failed:", result.error);
                showNotification("快速收藏失败", result.error || "未知错误", true);
            }
        } catch (error: any) {
            console.error("Error in quick bookmark:", error);
            showNotification("快速收藏失败", error.message || "未知错误", true);
        }

        console.log("=== Quick Bookmark Process Complete ===");
    }
});

/**
 * 显示通知
 */
function showNotification(title: string, message: string, requireInteraction = false): void {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icon.png",
        title: title,
        message: message,
        requireInteraction: requireInteraction
    }, (notificationId) => {
        if (chrome.runtime.lastError) {
            console.error("Notification error:", chrome.runtime.lastError.message);
        } else {
            console.log("Notification created:", notificationId);
        }
    });
}

/**
 * LLM 配置接口
 */
interface LLMConfig {
    model: string;
    temperature: number;
    apiKey: string;
    baseURL: string;
}

/**
 * 从 Chrome Storage 获取 LLM 配置
 */
async function getLLMConfig(): Promise<LLMConfig> {
    return new Promise((resolve) => {
        chrome.storage.local.get(["llm_config"], (result) => {
            const config = result.llm_config as LLMConfig;
            console.log("LLM Config:", config ? "Found in storage" : "Using default");
            resolve(config || {
                model: "ep-20250331114927-lhcpd",
                temperature: 0.7,
                apiKey: "fa012c3c-4429-4ab0-b786-62e074a6d52c",
                baseURL: "https://ark.cn-beijing.volces.com/api/v3",
            });
        });
    });
}

/**
 * 调用 LLM API 分析应该放入哪个文件夹
 */
async function callLLMForFolder(url: string, title: string, folderTree: any[]): Promise<string> {
    console.log("Calling LLM API for folder analysis...");
    const config = await getLLMConfig();

    const prompt = `你是一个书签管理助手。请分析以下网页，决定应该放入哪个文件夹。

网页标题：${title}
网页 URL：${url}

当前可用的文件夹结构（JSON 格式）：
${JSON.stringify(folderTree, null, 2)}

请直接返回应该放入的文件夹 ID（数字字符串），不需要解释。如果找不到合适的文件夹，返回 "1"（默认书签栏）。

重要：
- 只返回文件夹 ID，如 "1", "2", "3" 等
- 不要返回任何解释文字
- ID 必须是 JSON 中存在的文件夹 id`;

    try {
        console.log("Sending request to:", config.baseURL);
        const response = await fetch(`${config.baseURL}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    {
                        role: "system",
                        content: "你是一个书签分类助手。用户会告诉你网页信息和文件夹结构，你只需要返回最合适的文件夹 ID（数字字符串），不要返回任何其他内容。"
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: config.temperature,
                max_tokens: 10
            })
        });

        console.log("LLM Response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("LLM API error:", response.status, response.statusText, errorText);
            throw new Error(`LLM API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log("LLM Response data:", data);
        const content = data.choices[0]?.message?.content?.trim() || "1";
        console.log("LLM Suggested folder ID:", content);

        // 提取数字 ID（防止 LLM 返回多余文字）
        const idMatch = content.match(/\d+/);
        return idMatch ? idMatch[0] : "1";

    } catch (error) {
        console.error("Error calling LLM:", error);
        // 降级到关键词匹配
        console.log("Falling back to folder ID: 1");
        return "1";
    }
}

/**
 * 使用 AI Agent 分析并创建书签
 */
async function analyzeAndBookmark(url: string, title: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    folderName?: string;
}> {
    try {
        console.log("Step 1: Getting bookmark tree...");
        // 1. 获取书签树结构
        const tree = await chrome.bookmarks.getTree();
        console.log("Bookmark tree retrieved, root has", tree[0]?.children?.length || 0, "top-level items");

        // 2. 简化书签树用于 AI 分析
        console.log("Step 2: Simplifying tree for AI...");
        const simplifiedTree = simplifyBookmarkTree(tree);
        console.log("Simplified tree:", JSON.stringify(simplifiedTree).substring(0, 500) + "...");

        // 3. 调用 LLM 分析
        console.log("Step 3: Calling LLM...");
        const targetFolderId = await callLLMForFolder(url, title, simplifiedTree);
        console.log("Target folder ID:", targetFolderId);

        // 4. 创建书签
        console.log("Step 4: Creating bookmark...");
        const bookmark = await chrome.bookmarks.create({
            title: title,
            url: url,
            parentId: targetFolderId
        });
        console.log("Bookmark created successfully:", bookmark);

        // 获取文件夹名称用于显示
        const folder = await chrome.bookmarks.get(targetFolderId);
        const folderName = folder[0]?.title || "书签栏";
        console.log("Folder name:", folderName);

        return {
            success: true,
            message: `"${title}" 已添加到 "${folderName}"`,
            folderName: folderName
        };

    } catch (error: any) {
        console.error("Error in analyzeAndBookmark:", error);
        console.error("Error stack:", error.stack);
        return {
            success: false,
            error: error.message || "未知错误"
        };
    }
}

/**
 * 简化书签树结构
 */
function simplifyBookmarkTree(nodes: chrome.bookmarks.BookmarkTreeNode[]): any[] {
    return nodes.map((node) => {
        const isFolder = !node.url;
        const simplified: any = {
            id: node.id,
            title: node.title || (node.id === "0" ? "Root" : "Untitled")
        };

        if (isFolder) {
            simplified.type = "folder";
            if (node.children && node.children.length > 0) {
                simplified.children = simplifyBookmarkTree(node.children);
            } else {
                simplified.children = [];
            }
        } else {
            simplified.type = "bookmark";
            simplified.url = node.url;
        }
        return simplified;
    });
}
