// Content Script - 运行在网页上下文中，可以访问页面DOM

const OVERLAY_ID = "llm-browser-agent-overlay";

const CONFIG = {
    MIN_WIDTH: 5,
    MIN_HEIGHT: 5,
    INTERACTIVE_TAGS: new Set(["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "DETAILS", "SUMMARY"]),
    INTERACTIVE_ROLES: new Set([
        "button",
        "link",
        "checkbox",
        "menuitem",
        "menuitemcheckbox",
        "radio",
        "tab",
        "textbox",
        "combobox",
        "searchbox",
    ]),
    SEMANTIC_MAP: {
        CODE: "code",
        PRE: "code",
        H1: "heading",
        H2: "heading",
        H3: "heading",
        H4: "heading",
        H5: "heading",
        H6: "heading",
        LI: "list-item",
        IMG: "image",
    },
    TEXT_TAGS: new Set([
        "P",
        "SPAN",
        "DIV",
        "LABEL",
        "TD",
        "TH",
        "B",
        "STRONG",
        "I",
        "EM",
        "FONT",
        "BLOCKQUOTE",
        "H1",
        "H2",
        "H3",
        "H4",
        "H5",
        "H6",
        "LI",
        "PRE",
        "CODE",
    ]),
};

interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

interface ElementData {
    id: string;
    tag: string;
    category: string;
    text: string;
    rect: Rect;
    inViewport: boolean;
    isShadow: boolean;
}

let uniqueIdCounter = 1;

// --- 基础工具 ---
function deepQuerySelectorAll(root: Element | Document): Element[] {
    let allElements: Element[] = [];
    const els = root.querySelectorAll("*");
    els.forEach((element) => {
        if (element.id === OVERLAY_ID || element.closest(`#${OVERLAY_ID}`)) return;
        allElements.push(element);
        if ((element as any).shadowRoot) {
            allElements = allElements.concat(deepQuerySelectorAll((element as any).shadowRoot));
        }
    });
    return allElements;
}

function isVisible(_el: Element, style: CSSStyleDeclaration, rect: DOMRect): boolean {
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0")
        return false;
    if (rect.width < 1 || rect.height < 1) return false;
    return true;
}

function isInteractive(el: Element, style: CSSStyleDeclaration): boolean {
    if (CONFIG.INTERACTIVE_TAGS.has(el.tagName)) return true;
    const role = el.getAttribute("role");
    if (role && CONFIG.INTERACTIVE_ROLES.has(role)) return true;
    if (style.cursor === "pointer") return true;
    if (el.getAttribute("contenteditable") === "true") return true;
    const tabindex = el.getAttribute("tabindex");
    if (tabindex && parseInt(tabindex) >= 0) return true;
    return false;
}

function isMeaningfulText(el: Element): boolean {
    if (!CONFIG.TEXT_TAGS.has(el.tagName)) return false;
    const hasBlockChildren = Array.from(el.children).some((child) => {
        const childStyle = window.getComputedStyle(child);
        return (
            childStyle.display === "block" ||
            childStyle.display === "flex" ||
            childStyle.display === "grid"
        );
    });
    if (hasBlockChildren) return false;
    const text = (el as HTMLElement).innerText || (el as HTMLElement).textContent || "";
    if (text.length === 0 || text.length > 20000) return false;
    return true;
}

function getElementLabel(el: Element, isInput: boolean): string {
    let text = "";
    if (isInput) {
        if (el.id) {
            const labelEl = document.querySelector(`label[for="${el.id}"]`);
            if (labelEl)
                text = (labelEl as HTMLElement).innerText || (labelEl as HTMLElement).textContent || "";
        }
        if (!text) text = el.getAttribute("aria-label") || el.getAttribute("placeholder") || "";
    } else {
        text = (el as HTMLElement).innerText || (el as HTMLElement).textContent || "";
    }
    return String(text || "")
        .replace(/[\n\r]+/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim()
        .slice(0, 1000);
}

function getCategory(el: Element, isInteractive: boolean): string {
    if (isInteractive) {
        return el.tagName === "INPUT" || el.tagName === "TEXTAREA" ? "input" : "clickable";
    }
    if (CONFIG.SEMANTIC_MAP[el.tagName as keyof typeof CONFIG.SEMANTIC_MAP]) {
        return CONFIG.SEMANTIC_MAP[el.tagName as keyof typeof CONFIG.SEMANTIC_MAP];
    }
    return "text";
}

// --- 步骤1: 去重 ---
function filterDuplicates(data: ElementData[]): ElementData[] {
    const groups: Record<string, ElementData[]> = {};
    data.forEach((item) => {
        const key = `${item.rect.x},${item.rect.y},${item.rect.w},${item.rect.h}|${item.text}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    });

    const result: ElementData[] = [];
    Object.values(groups).forEach((group) => {
        if (group.length === 1) {
            result.push(group[0]);
        } else {
            group.sort((a, b) => {
                const score = (cat: string) => {
                    if (cat === "clickable" || cat === "input") return 10;
                    if (cat === "heading" || cat === "code") return 5;
                    return 0;
                };
                const scoreA = score(a.category);
                const scoreB = score(b.category);
                if (scoreA !== scoreB) return scoreB - scoreA;
                return parseInt(b.id) - parseInt(a.id);
            });
            result.push(group[0]);
        }
    });
    return result;
}

// --- 步骤2: 聚合 ---
function mergeNearbyText(data: ElementData[]): ElementData[] {
    if (data.length === 0) return [];

    const textFlow = data.filter((item) =>
        ["text", "heading", "code", "list-item"].includes(item.category)
    );
    const interactiveFlow = data.filter(
        (item) => !["text", "heading", "code", "list-item"].includes(item.category)
    );

    textFlow.sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);

    const mergedTexts: ElementData[] = [];
    if (textFlow.length === 0) return interactiveFlow;

    let current = textFlow[0];

    for (let i = 1; i < textFlow.length; i++) {
        const next = textFlow[i];
        const X_TOLERANCE = 20;
        const Y_GAP_TOLERANCE = 50;

        const isSameCategory = current.category === next.category;
        const isAlignedX = Math.abs(current.rect.x - next.rect.x) < X_TOLERANCE;
        const isWidthSimilar = Math.abs(current.rect.w - next.rect.w) < 200;
        const currentBottom = current.rect.y + current.rect.h;
        const gap = next.rect.y - currentBottom;
        const isCloseY = gap >= -10 && gap < Y_GAP_TOLERANCE;

        if (isSameCategory && isAlignedX && isCloseY && isWidthSimilar) {
            current.text += "\n" + next.text;
            const newBottom = next.rect.y + next.rect.h;
            current.rect.h = newBottom - current.rect.y;
            current.rect.w = Math.max(current.rect.w, next.rect.w);
        } else {
            mergedTexts.push(current);
            current = next;
        }
    }
    mergedTexts.push(current);

    return [...mergedTexts, ...interactiveFlow];
}

// --- 主扫描逻辑 ---
function scanPage(): ElementData[] {
    console.time("ScanTotal");
    const allElements = deepQuerySelectorAll(document);
    let rawData: ElementData[] = [];
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    allElements.forEach((el) => {
        let style: CSSStyleDeclaration, rect: DOMRect;
        try {
            style = window.getComputedStyle(el);
            rect = el.getBoundingClientRect();
        } catch (e) {
            return;
        }

        if (!isVisible(el, style, rect)) return;

        const interactive = isInteractive(el, style);
        const meaningfulText = !interactive && isMeaningfulText(el);

        if (!interactive && !meaningfulText) return;

        let llmId = el.getAttribute("data-llm-id");
        if (!llmId) {
            llmId = String(uniqueIdCounter++);
            el.setAttribute("data-llm-id", llmId);
        }

        const inViewport =
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= viewportHeight &&
            rect.right <= viewportWidth;

        const category = getCategory(el, interactive);

        rawData.push({
            id: llmId,
            tag: el.tagName.toLowerCase(),
            category: category,
            text: getElementLabel(el, category === "input"),
            rect: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                w: Math.round(rect.width),
                h: Math.round(rect.height),
            },
            inViewport: inViewport,
            isShadow: !!(el.getRootNode() as any)?.host,
        });
    });

    let processedData = filterDuplicates(rawData);
    processedData = mergeNearbyText(processedData);
    processedData.sort((a, b) => parseInt(a.id) - parseInt(b.id));

    console.log(`[Perception] 完成: ${processedData.length} 个元素`);
    console.timeEnd("ScanTotal");
    return processedData;
}

// --- 绘制边界框 ---
function drawBoundingBoxes(
    elements: ElementData[],
    showTextNodes: boolean,
    showInteractiveNodes: boolean
) {
    const existingOverlay = document.getElementById(OVERLAY_ID);
    if (existingOverlay) existingOverlay.remove();

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    Object.assign(overlay.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100vw",
        height: "100vh",
        zIndex: "2147483647",
        pointerEvents: "none",
        overflow: "hidden",
    });

    const COLOR_MAP: Record<string, string> = {
        clickable: "#ff0042",
        input: "#ff0042",
        text: "#2196F3",
        heading: "#FF9800",
        code: "#9C27B0",
        "list-item": "#4CAF50",
    };

    elements.forEach((item) => {
        if (!item.inViewport) return;

        const isText = ["text", "heading", "code", "list-item"].includes(item.category);
        const isInteractive = item.category === "clickable" || item.category === "input";

        if (isText && !showTextNodes) return;
        if (isInteractive && !showInteractiveNodes) return;

        const {x, y, w, h} = item.rect;
        const box = document.createElement("div");

        const color = COLOR_MAP[item.category] || "#2196F3";
        const borderStyle = isInteractive ? "solid" : "dashed";
        const borderWidth = item.category === "heading" ? "2px" : "1px";

        Object.assign(box.style, {
            position: "absolute",
            left: `${x}px`,
            top: `${y}px`,
            width: `${w}px`,
            height: `${h}px`,
            border: `${borderWidth} ${borderStyle} ${color}`,
            backgroundColor: isInteractive ? "rgba(255, 0, 66, 0.05)" : "transparent",
            borderRadius: "2px",
            boxSizing: "border-box",
        });

        if (isInteractive || item.category === "code") {
            const label = document.createElement("div");
            label.innerText = isInteractive ? item.id : "CODE";
            Object.assign(label.style, {
                position: "absolute",
                top: "-18px",
                left: "-1px",
                backgroundColor: color,
                color: "white",
                fontSize: "10px",
                padding: "0 4px",
                borderRadius: "2px",
            });
            if (y < 20) label.style.top = "0";
            box.appendChild(label);
        }

        overlay.appendChild(box);
    });
    document.body.appendChild(overlay);
}

// --- 消息监听 ---
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "SCAN_PAGE") {
        try {
            const result = scanPage();
            sendResponse({data: result});
        } catch (error) {
            sendResponse({
                error: error instanceof Error ? error.message : String(error),
            });
        }
        return true; // 保持消息通道开启以支持异步响应
    }

    if (message.type === "DRAW_BOXES") {
        try {
            drawBoundingBoxes(message.data, message.showTextNodes, message.showInteractiveNodes);
            sendResponse({success: true});
        } catch (error) {
            sendResponse({
                error: error instanceof Error ? error.message : String(error),
            });
        }
        return true;
    }

    if (message.type === "CLEAR_BOXES") {
        try {
            const existingOverlay = document.getElementById(OVERLAY_ID);
            if (existingOverlay) existingOverlay.remove();
            sendResponse({success: true});
        } catch (error) {
            sendResponse({
                error: error instanceof Error ? error.message : String(error),
            });
        }
        return true;
    }

    return false;
});

console.log("[PagePerception Content Script] Loaded");
