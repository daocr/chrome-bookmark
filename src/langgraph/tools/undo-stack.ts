// undoStack.ts


export type UndoAction =
    | { type: "DELETE"; payload: { id: string } } // 用于撤销 Create
    | { type: "CREATE"; payload: { parentId: string; title: string; url?: string; index?: number } } // 用于撤销 Delete
    | { type: "MOVE"; payload: { id: string; parentId: string; index: number } } // 用于撤销 Move
    | { type: "UPDATE"; payload: { id: string; title: string; url?: string } }; // 用于撤销 Update

// 一次用户的批量操作可能对应多个原子动作
export interface UndoCommandBatch {
    actions: UndoAction[];
    description: string;
}

export class UndoStack {
    private static stack: UndoCommandBatch[] = [];
    private static MAX_STACK_SIZE = 50;

    /**
     * 将逆操作压入堆栈
     */
    static push(command: UndoCommandBatch) {
        this.stack.push(command);
        if (this.stack.length > this.MAX_STACK_SIZE) {
            this.stack.shift(); // 维持最大栈深
        }
        console.log(`[UndoStack] Pushed: ${command.description}. Stack size: ${this.stack.length}`);
    }

    /**
     * 弹出并执行栈顶的逆操作
     */
    static async popAndExecute(): Promise<string | null> {
        if (this.stack.length === 0) {
            return null;
        }

        const command = this.stack.pop()!;

        // 注意：如果是撤销操作，最好反向遍历执行（LIFO），保证 index 的准确性
        const reversedActions = [...command.actions].reverse();

        for (const action of reversedActions) {
            try {
                switch (action.type) {
                    case "DELETE":
                        await chrome.bookmarks.remove(action.payload.id);
                        break;
                    case "CREATE":
                        await chrome.bookmarks.create({
                            parentId: action.payload.parentId,
                            title: action.payload.title,
                            url: action.payload.url,
                            index: action.payload.index,
                        });
                        break;
                    case "MOVE":
                        await chrome.bookmarks.move(action.payload.id, {
                            parentId: action.payload.parentId,
                            index: action.payload.index,
                        });
                        break;
                    case "UPDATE":
                        await chrome.bookmarks.update(action.payload.id, {
                            title: action.payload.title,
                            url: action.payload.url,
                        });
                        break;
                }
            } catch (e) {
                console.error(`[UndoStack] Failed to execute undo action:`, action, e);
                // 发生错误时可以选择中断或继续，取决于你的容错策略
            }
        }

        return command.description;
    }

    static clear() {
        this.stack = [];
    }
}