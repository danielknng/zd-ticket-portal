/**
 * @fileoverview Cache repository with TTL support
 * @author danielknng
 * @module api/cache
 * @since 2025-01-XX
 * @version 2.0.0
 */

import Storage from '../core/storage.js';
import nfLogger from '../core/logger.js';

/**
 * Simple in-memory cache with time-to-live (TTL) support.
 * Used for caching API responses (tickets, details, search results) to improve performance.
 * Supports both memory and localStorage persistence for certain key types.
 * 
 * @class CacheRepository
 */
export class CacheRepository {
    /**
     * Creates a new cache instance with memory and localStorage support
     * @constructor
     * @param {Object} [storage] - Storage utility (defaults to global Storage)
     */
    constructor(storage = Storage) {
        /** @type {Map} In-memory cache storage */
        this.memory = new Map();
        /** @type {Map} Expiry timestamps for cached values */
        this.timestamps = new Map();
        /** @type {string} Prefix for localStorage keys */
        this.localStoragePrefix = 'nfCache_';
        /** @type {Object} Storage utility */
        this.storage = storage;
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
        
        // Persist to localStorage (ticket-related, search results, and request types)
        if (key.startsWith('ticket') || key.startsWith('search_') || key === 'request_types') {
            const data = {
                value,
                expiry: Date.now() + ttl
            };
            this.storage.set(this.localStoragePrefix + key, data);
            
            // Debug logging for localStorage
            nfLogger.debug('Cache saved to localStorage', {
                key,
                ttlDays: Math.round(ttl / (24 * 60 * 60 * 1000)),
                expiryDate: new Date(Date.now() + ttl).toISOString()
            });
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
        
        // Check localStorage (ticket-related, search results, and request types)
        if (key.startsWith('ticket') || key.startsWith('search_') || key === 'request_types') {
            const data = this.storage.get(this.localStoragePrefix + key);
            if (data && data.expiry && Date.now() < data.expiry) {
                // Restore to memory for faster access next time
                this.memory.set(key, data.value);
                this.timestamps.set(key, data.expiry);
                
                // Debug logging for localStorage
                const cacheType = key.startsWith('search_') ? 'search results' : 'ticket data';
                const cacheAgeMs = Date.now() - (data.value.cachedAt || 0);
                const cacheAgeDays = Math.round(cacheAgeMs / (24 * 60 * 60 * 1000));
                nfLogger.debug(`Cache loaded from localStorage (${cacheType})`, {
                    key,
                    cacheAgeDays,
                    expiryDate: new Date(data.expiry).toISOString()
                });
                return data.value;
            } else if (data) {
                // Expired, clean up
                this.storage.remove(this.localStoragePrefix + key);
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
            this.storage.remove(this.localStoragePrefix + key);
        }
    }

    /**
     * Invalidates cache entries matching a pattern
     * @param {string} pattern - Pattern to match (e.g., 'ticket_detail_*')
     */
    invalidatePattern(pattern) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        const keysToRemove = [];
        
        for (const key of this.memory.keys()) {
            if (regex.test(key)) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => this.invalidate(key));
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
                    this.storage.remove(key);
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
                    this.storage.remove(this.localStoragePrefix + key);
                }
            }
        }
    }
}

// Create singleton instance
const cacheRepository = new CacheRepository();

// Lazy cleanup - only when needed
let lastCleanup = 0;
const cleanupInterval = 60000; // 1 minute

const originalGet = cacheRepository.get.bind(cacheRepository);
cacheRepository.get = function(key) {
    const now = Date.now();
    if (now - lastCleanup > cleanupInterval) {
        this.cleanup();
        lastCleanup = now;
    }
    return originalGet(key);
};


export default cacheRepository;
