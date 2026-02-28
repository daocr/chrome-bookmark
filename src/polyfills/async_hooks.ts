// Polyfill for async_hooks in browser environment
// This is a minimal implementation for compatibility

export class AsyncLocalStorage<T> {
    private store: T | undefined;

    getStore(): T | undefined {
        return this.store;
    }

    run(store: T, callback: (...args: any[]) => any, ...args: any[]): any {
        const previousStore = this.store;
        this.store = store;
        try {
            return callback(...args);
        } finally {
            this.store = previousStore;
        }
    }

    enterWith(store: T): void {
        this.store = store;
    }

    disable(): void {
        this.store = undefined;
    }
}
