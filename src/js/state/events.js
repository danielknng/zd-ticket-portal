/**
 * @fileoverview Event bus for decoupled cross-module communication
 * @author danielknng
 * @module state/events
 * @since 2025-01-XX
 * @version 2.0.0
 */

/**
 * Simple event bus implementation for decoupled module communication
 * Allows modules to publish and subscribe to events without direct dependencies
 * 
 * @class EventBus
 */
export class EventBus {
    constructor() {
        /** @private */
        this._listeners = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} eventName - Name of the event to listen for
     * @param {Function} callback - Callback function to execute when event fires
     * @param {Object} [options] - Options object
     * @param {boolean} [options.once=false] - If true, listener is removed after first call
     * @returns {Function} Unsubscribe function
     */
    on(eventName, callback, options = {}) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        if (!this._listeners.has(eventName)) {
            this._listeners.set(eventName, []);
        }

        const listener = {
            callback,
            once: options.once || false
        };

        this._listeners.get(eventName).push(listener);

        // Return unsubscribe function
        return () => {
            this.off(eventName, callback);
        };
    }

    /**
     * Subscribe to an event (fires only once)
     * @param {string} eventName - Name of the event to listen for
     * @param {Function} callback - Callback function to execute when event fires
     * @returns {Function} Unsubscribe function
     */
    once(eventName, callback) {
        return this.on(eventName, callback, { once: true });
    }

    /**
     * Unsubscribe from an event
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Callback function to remove (optional, removes all if not provided)
     */
    off(eventName, callback) {
        if (!this._listeners.has(eventName)) {
            return;
        }

        const listeners = this._listeners.get(eventName);

        if (callback) {
            // Remove specific callback
            const index = listeners.findIndex(l => l.callback === callback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        } else {
            // Remove all listeners for this event
            listeners.length = 0;
        }

        // Clean up empty arrays
        if (listeners.length === 0) {
            this._listeners.delete(eventName);
        }
    }

    /**
     * Emit an event to all subscribers
     * @param {string} eventName - Name of the event to emit
     * @param {...*} args - Arguments to pass to callbacks
     */
    emit(eventName, ...args) {
        if (!this._listeners.has(eventName)) {
            return;
        }

        const listeners = this._listeners.get(eventName).slice(); // Copy array to avoid issues if listeners modify during iteration

        listeners.forEach(listener => {
            try {
                listener.callback(...args);
            } catch (error) {
                console.error(`Error in event listener for "${eventName}":`, error);
            }

            // Remove if it's a once listener
            if (listener.once) {
                this.off(eventName, listener.callback);
            }
        });
    }

    /**
     * Get all event names that have listeners
     * @returns {Array<string>} Array of event names
     */
    getEventNames() {
        return Array.from(this._listeners.keys());
    }

    /**
     * Get listener count for an event
     * @param {string} eventName - Name of the event
     * @returns {number} Number of listeners
     */
    listenerCount(eventName) {
        return this._listeners.has(eventName) ? this._listeners.get(eventName).length : 0;
    }

    /**
     * Remove all listeners
     */
    removeAllListeners() {
        this._listeners.clear();
    }
}

// Create singleton instance
const eventBus = new EventBus();

export default eventBus;

