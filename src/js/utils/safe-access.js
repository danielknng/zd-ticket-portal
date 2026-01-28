/**
 * @fileoverview Safe access utilities to eliminate typeof checks
 * @author danielknng
 * @module utils/safe-access
 * @since 2025-01-XX
 * @version 2.0.0
 */

/**
 * Safe access utilities to eliminate 279+ typeof checks
 * Provides cached access to global objects
 * 
 * @namespace safe
 */
export const safe = {
    /**
     * Safe window access
     * @type {Window|null}
     */
    get window() {
        return typeof window !== 'undefined' ? window : null;
    },

    /**
     * Safe config access
     * @type {Object|null}
     */
    get config() {
        return this.window && this.window.NF_CONFIG ? this.window.NF_CONFIG : null;
    },

    /**
     * Safe state access
     * @type {Object|null}
     */
    get state() {
        return this.window && this.window.appState ? this.window.appState : null;
    }
};

// Make available globally for backward compatibility
if (typeof window !== 'undefined') {
    window.safe = safe;
}

export default safe;

