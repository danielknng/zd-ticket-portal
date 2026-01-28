/**
 * @fileoverview Centralized state management for application state
 * @author danielknng
 * @module state/store
 * @since 2025-01-XX
 * @version 2.0.0
 */

/**
 * Simple state management class with getter/setter and subscription support
 * Provides reactive state updates and centralized state access
 * 
 * @class AppState
 */
export class AppState {
    constructor() {
        /** @private */
        this._state = {
            userToken: null,
            userId: null,
            loginAttempts: 0,
            isAccountLocked: false
        };

        /** @private */
        this._subscribers = new Map();
    }

    /**
     * Get a state value
     * @param {string} key - State key
     * @returns {*} State value
     */
    get(key) {
        return this._state[key];
    }

    /**
     * Set a state value and notify subscribers
     * @param {string} key - State key
     * @param {*} value - New value
     * @param {boolean} [silent=false] - If true, don't notify subscribers
     */
    set(key, value, silent = false) {
        const oldValue = this._state[key];
        this._state[key] = value;

        if (!silent && oldValue !== value) {
            this._notifySubscribers(key, value, oldValue);
        }
    }

    /**
     * Subscribe to state changes
     * @param {string} key - State key to watch (or '*' for all changes)
     * @param {Function} callback - Callback function (newValue, oldValue, key)
     * @returns {Function} Unsubscribe function
     */
    subscribe(key, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        if (!this._subscribers.has(key)) {
            this._subscribers.set(key, []);
        }

        this._subscribers.get(key).push(callback);

        // Return unsubscribe function
        return () => {
            this.unsubscribe(key, callback);
        };
    }

    /**
     * Unsubscribe from state changes
     * @param {string} key - State key
     * @param {Function} callback - Callback function to remove
     */
    unsubscribe(key, callback) {
        if (!this._subscribers.has(key)) {
            return;
        }

        const callbacks = this._subscribers.get(key);
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
            callbacks.splice(index, 1);
        }

        // Clean up empty arrays
        if (callbacks.length === 0) {
            this._subscribers.delete(key);
        }
    }

    /**
     * Get all current state
     * @returns {Object} Copy of current state
     */
    getAll() {
        return { ...this._state };
    }

    /**
     * Set multiple state values at once
     * @param {Object} updates - Object with key-value pairs to update
     * @param {boolean} [silent=false] - If true, don't notify subscribers
     */
    setMultiple(updates, silent = false) {
        const oldValues = {};
        const changedKeys = [];

        // Collect old values and changed keys
        Object.keys(updates).forEach(key => {
            oldValues[key] = this._state[key];
            if (this._state[key] !== updates[key]) {
                changedKeys.push(key);
            }
            this._state[key] = updates[key];
        });

        // Notify subscribers for each changed key
        if (!silent && changedKeys.length > 0) {
            changedKeys.forEach(key => {
                this._notifySubscribers(key, this._state[key], oldValues[key]);
            });
        }
    }

    /**
     * Reset state to initial values
     */
    reset() {
        const oldState = { ...this._state };
        this._state = {
            userToken: null,
            userId: null,
            loginAttempts: 0,
            isAccountLocked: false
        };

        // Notify subscribers of all changes
        Object.keys(this._state).forEach(key => {
            if (oldState[key] !== this._state[key]) {
                this._notifySubscribers(key, this._state[key], oldState[key]);
            }
        });
    }

    /**
     * Notify subscribers of a state change
     * @private
     * @param {string} key - State key that changed
     * @param {*} newValue - New value
     * @param {*} oldValue - Old value
     */
    _notifySubscribers(key, newValue, oldValue) {
        // Notify specific key subscribers
        if (this._subscribers.has(key)) {
            this._subscribers.get(key).forEach(callback => {
                try {
                    callback(newValue, oldValue, key);
                } catch (error) {
                    console.error(`Error in state subscriber for "${key}":`, error);
                }
            });
        }

        // Notify wildcard subscribers
        if (this._subscribers.has('*')) {
            this._subscribers.get('*').forEach(callback => {
                try {
                    callback(newValue, oldValue, key);
                } catch (error) {
                    console.error(`Error in wildcard state subscriber:`, error);
                }
            });
        }
    }
}

// Create singleton instance
const appState = new AppState();

// Make available globally for backward compatibility
if (typeof window !== 'undefined') {
    window.appState = appState;
    window.AppState = AppState;
}

export default appState;

