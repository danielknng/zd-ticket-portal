/**
 * @fileoverview Error boundary wrapper for consistent error handling
 * @author danielknng
 * @module utils/error-boundary
 * @since 2025-01-XX
 * @version 2.0.0
 */

import nfLogger from '../core/logger.js';

/**
 * Wraps a function with consistent error handling
 * Eliminates duplication of try/catch/throw patterns
 * 
 * @param {Function} fn - Function to wrap
 * @param {string} context - Context description for error messages
 * @returns {Function} Wrapped function with error handling
 */
export function withErrorHandling(fn, context) {
    return async function(...args) {
        try {
            return await fn.apply(this, args);
        } catch (error) {
            nfLogger.error(`${context} failed`, { error: error.message, context });
            throw error;
        }
    };
}

export default withErrorHandling;

