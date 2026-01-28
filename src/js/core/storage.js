/**
 * @fileoverview Storage utilities for localStorage with automatic error handling
 * @author danielknng
 * @module core/storage
 * @since 2025-01-XX
 * @version 2.0.0
 */

import nfLogger from './logger.js';
import languageManager from '../i18n/manager.js';

/**
 * Wrapper object for safe localStorage access with automatic error handling
 * Prevents crashes if storage is full or localStorage is disabled
 * 
 * @namespace Storage
 */
export const Storage = {
    /**
     * Stores a value in localStorage with automatic JSON serialization
     * @param {string} key - Unique key for the stored value
     * @param {*} value - Value to store (will be converted to JSON)
     * @returns {boolean} true on success, false on error
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            const message = languageManager 
                ? languageManager.getUtilsMessage('localStorageWriteFailed')
                : 'Failed to write to localStorage';
            nfLogger.warn(message, { key, error: e.message });
            return false;
        }
    },
    
    /**
     * Loads a value from localStorage with automatic JSON deserialization
     * @param {string} key - Key of the value to load
     * @param {*} defaultValue - Return value if key does not exist or error occurs
     * @returns {*} Stored value or defaultValue
     */
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            const message = languageManager 
                ? languageManager.getUtilsMessage('localStorageReadFailed')
                : 'Failed to read from localStorage';
            nfLogger.warn(message, { key, error: e.message });
            return defaultValue;
        }
    },
    
    /**
     * Removes a value from localStorage
     * @param {string} key - Key of the value to remove
     * @returns {boolean} true on success, false on error
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            const message = languageManager 
                ? languageManager.getUtilsMessage('localStorageRemoveFailed')
                : 'Failed to remove from localStorage';
            nfLogger.warn(message, { key, error: e.message });
            return false;
        }
    }
};

// Make available globally for backward compatibility
if (typeof window !== 'undefined') {
    window.NFStorage = Storage;
}

export default Storage;

