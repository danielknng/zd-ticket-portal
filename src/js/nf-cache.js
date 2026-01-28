/**
 * @fileoverview Local-storage cache with TTL for ticket frontend
 * @author danielknng
 * @module NFCache
 * @since 2025-07-15
 * @version 1.0.0
 */

import { NF_CONFIG } from './nf-config.js';

/**
 * Simple in-memory cache with time-to-live (TTL) support.
 * Used for caching API responses (tickets, details, search results) to improve performance.
 * Supports both memory and localStorage persistence for certain key types.
 * 
 * @class NFCache
 */
class NFCache {
    /**
     * Creates a new cache instance with memory and localStorage support
     * @constructor
     */
    constructor() {
        /** @type {Map} In-memory cache storage */
        this.memory = new Map();
        /** @type {Map} Expiry timestamps for cached values */
        this.timestamps = new Map();
        /** @type {string} Prefix for localStorage keys */
        this.localStoragePrefix = 'nfCache_';
    }

    /**
     * Stores a value in the cache with TTL and optional localStorage persistence
     * @param {string} key - Unique cache key
     * @param {*} value - Value to cache
     * @param {number} ttl - Time to live in milliseconds (required)
     * @throws {Error} When TTL is not provided or invalid
     */
    set(key, value, ttl) {
        if (!ttl || ttl <= 0) {
            throw new Error('TTL must be provided and greater than 0');
        }
        this.memory.set(key, value);
        this.timestamps.set(key, Date.now() + ttl);
        // Persist to localStorage (ticket-related and search results)
        if (key.startsWith('ticket') || key.startsWith('search_')) {
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
            // Debug logging for localStorage
            if (typeof window !== 'undefined' && window.nfLogger) {
                window.nfLogger.debug('Cache saved to localStorage', {
                    key,
                    ttlDays: Math.round(ttl / (24 * 60 * 60 * 1000)),
                    expiryDate: new Date(Date.now() + ttl).toISOString()
                });
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
        // Check localStorage (ticket-related and search results)
        if (key.startsWith('ticket') || key.startsWith('search_')) {
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
                // Debug logging for localStorage
                if (typeof window !== 'undefined' && window.nfLogger) {
                    const cacheType = key.startsWith('search_') ? 'search results' : 'ticket data';
                    const cacheAgeMs = Date.now() - (data.value.cachedAt || 0);
                    const cacheAgeDays = Math.round(cacheAgeMs / (24 * 60 * 60 * 1000));
                    window.nfLogger.debug(`Cache loaded from localStorage (${cacheType})`, {
                        key,
                        cacheAgeDays,
                        expiryDate: new Date(data.expiry).toISOString()
                    });
                }
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
