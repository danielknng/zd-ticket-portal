/**
 * @fileoverview Loading state wrapper to eliminate duplication
 * @author danielknng
 * @module utils/loading
 * @since 2025-01-XX
 * @version 2.0.0
 */

/**
 * Wraps a function with loading state management
 * Eliminates 30+ duplications of loading pattern
 * 
 * @param {Function} fn - Function to wrap
 * @param {Function} [setLoading] - Loading setter function (defaults to global nfSetLoading)
 * @returns {Function} Wrapped function with loading state
 */
export function withLoading(fn, setLoading) {
    if (!setLoading) {
        throw new Error('setLoading function is required');
    }
    const loadingFn = setLoading;
    
    return async function(...args) {
        loadingFn(true);
        try {
            return await fn.apply(this, args);
        } finally {
            loadingFn(false);
        }
    };
}

export default withLoading;

