/**
 * Lightweight EventEmitter for TenxyteClient.
 * Provides `.on`, `.once`, `.off`, and `.emit`.
 */
export class EventEmitter<Events extends Record<string, any>> {
    private events: Map<keyof Events, Array<Function>>;

    constructor() {
        this.events = new Map();
    }

    /**
     * Subscribe to an event.
     * @param event The event name
     * @param callback The callback function
     * @returns Unsubscribe function
     */
    on<K extends keyof Events>(event: K, callback: (payload: Events[K]) => void): () => void {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)!.push(callback);
        return () => this.off(event, callback);
    }

    /**
     * Unsubscribe from an event.
     * @param event The event name
     * @param callback The exact callback function that was passed to .on()
     */
    off<K extends keyof Events>(event: K, callback: (payload: Events[K]) => void): void {
        const callbacks = this.events.get(event);
        if (!callbacks) return;
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * Subscribe to an event exactly once.
     */
    once<K extends keyof Events>(event: K, callback: (payload: Events[K]) => void): () => void {
        const wrapped = (payload: Events[K]) => {
            this.off(event, wrapped);
            callback(payload);
        };
        return this.on(event, wrapped);
    }

    /**
     * Emit an event internally.
     */
    emit<K extends keyof Events>(event: K, payload: Events[K]): void {
        const callbacks = this.events.get(event);
        if (!callbacks) return;
        // Copy array to prevent mutation issues during emission
        const copy = [...callbacks];
        for (const callback of copy) {
            try {
                callback(payload);
            } catch (err) {
                console.error(`[Tenxyte EventEmitter] Error executing callback for event ${String(event)}`, err);
            }
        }
    }

    removeAllListeners(): void {
        this.events.clear();
    }
}
