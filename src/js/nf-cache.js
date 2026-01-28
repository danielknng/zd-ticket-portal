// Author: Daniel Könning
// ===============================
// nf-cache.js - Local-storage cache with TTL for ticket frontend
// ===============================
// This module provides a simple in-memory cache with time-to-live (TTL) support.
// Used for caching API responses (tickets, details, search results) to improve performance.

class NFCache {
    /**
     * Creates a new cache instance.
     * @constructor
     */
    constructor() {
        this.memory = new Map(); // Stores cached values
        this.timestamps = new Map(); // Stores expiry timestamps
        // Use default TTL from config if available, else fallback to 5 minutes
        this.defaultTTL = (window.NF_CONFIG && window.NF_CONFIG.ui && window.NF_CONFIG.ui.cache && window.NF_CONFIG.ui.cache.ticketListTTL)
            ? window.NF_CONFIG.ui.cache.ticketListTTL
            : 5 * 60 * 1000;
        this.localStoragePrefix = 'nfCache_';
    }
    /**
     * Stores a value in the cache with an optional TTL.
     * @param {string} key - Unique cache key
     * @param {*} value - Value to cache
     * @param {number} [ttl] - Time to live in ms (default: 5 min)
     */
    set(key, value, ttl = this.defaultTTL) {
        this.memory.set(key, value);
        this.timestamps.set(key, Date.now() + ttl);
        // Persist to localStorage (ticket-related only)
        if (key.startsWith('ticket')) {
            const data = {
                value,
                expiry: Date.now() + ttl
            };
            if (typeof NFUtils !== 'undefined' && NFUtils.storage) {
                NFUtils.storage.set(this.localStoragePrefix + key, data);
            } else {
                try {
                    localStorage.setItem(this.localStoragePrefix + key, JSON.stringify(data));
                } catch (e) {}
            }
        }
    }
    /**
     * Retrieves a value from the cache if not expired.
     * @param {string} key - Cache key
     * @returns {*} Cached value or null if not found/expired
     */
    get(key) {
        // Check in-memory first
        if (this.memory.has(key)) {
            const expiry = this.timestamps.get(key);
            if (Date.now() > expiry) {
                this.memory.delete(key);
                this.timestamps.delete(key);
            } else {
                return this.memory.get(key);
            }
        }
        // Check localStorage (ticket-related only)
        if (key.startsWith('ticket')) {
            let data = null;
            if (typeof NFUtils !== 'undefined' && NFUtils.storage) {
                data = NFUtils.storage.get(this.localStoragePrefix + key);
            } else {
                try {
                    data = JSON.parse(localStorage.getItem(this.localStoragePrefix + key));
                } catch (e) {}
            }
            if (data && data.expiry && Date.now() < data.expiry) {
                // Restore to memory for faster access next time
                this.memory.set(key, data.value);
                this.timestamps.set(key, data.expiry);
                return data.value;
            } else if (data) {
                // Expired, clean up
                if (typeof NFUtils !== 'undefined' && NFUtils.storage) {
                    NFUtils.storage.remove(this.localStoragePrefix + key);
                } else {
                    try { localStorage.removeItem(this.localStoragePrefix + key); } catch (e) {}
                }
            }
        }
        return null;
    }
    /**
     * Invalidates a specific cache entry.
     * @param {string} key - Cache key to remove
     */
    invalidate(key) {
        this.memory.delete(key);
        this.timestamps.delete(key);
        if (key.startsWith('ticket')) {
            if (typeof NFUtils !== 'undefined' && NFUtils.storage) {
                NFUtils.storage.remove(this.localStoragePrefix + key);
            } else {
                try { localStorage.removeItem(this.localStoragePrefix + key); } catch (e) {}
            }
        }
    }
    /**
     * Clears all cache entries.
     */
    clear() {
        this.memory.clear();
        this.timestamps.clear();
        // Remove all ticket-related cache from localStorage
        if (typeof localStorage !== 'undefined') {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(this.localStoragePrefix)) {
                    if (typeof NFUtils !== 'undefined' && NFUtils.storage) {
                        NFUtils.storage.remove(key);
                    } else {
                        try { localStorage.removeItem(key); } catch (e) {}
                    }
                }
            });
        }
    }
    /**
     * Removes expired cache entries.
     */
    cleanup() {
        const now = Date.now();
        for (const [key, expiry] of this.timestamps.entries()) {
            if (now > expiry) {
                this.memory.delete(key);
                this.timestamps.delete(key);
                if (key.startsWith('ticket')) {
                    if (typeof NFUtils !== 'undefined' && NFUtils.storage) {
                        NFUtils.storage.remove(this.localStoragePrefix + key);
                    } else {
                        try { localStorage.removeItem(this.localStoragePrefix + key); } catch (e) {}
                    }
                }
            }
        }
    }
}

const nfCache = new NFCache();

// Lazy cleanup - only when needed
let lastCleanup = 0;
const cleanupInterval = 60000; // 1 minute

const originalGet = nfCache.get;
nfCache.get = function(key) {
    const now = Date.now();
    if (now - lastCleanup > cleanupInterval) {
        this.cleanup();
        lastCleanup = now;
    }
    return originalGet.call(this, key);
};

// Make cache globally available
window.nfCache = nfCache;
