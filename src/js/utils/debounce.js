/**
 * @fileoverview Debounce utility function
 * @author danielknng
 * @module utils/debounce
 * @since 2025-01-XX
 * @version 2.0.0
 */

/**
 * Debounce function to reduce API calls on fast user input
 * Prevents excessive function calls during rapid input
 * 
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms before execution
 * @returns {Function} Debounced version of the original function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Convenience function for debounce with configured timeout
 * Uses the value from NF_CONFIG.ui.debounceTimeout
 * 
 * @param {Function} func - Function to debounce
 * @returns {Function} Debounced version with configured timeout
 */
export function debounceConfigured(func) {
    const timeout = typeof window !== 'undefined' && window.NF_CONFIG?.ui?.debounceTimeout 
        ? window.NF_CONFIG.ui.debounceTimeout 
        : 300;
    return debounce(func, timeout);
}

// Make available globally for backward compatibility
if (typeof window !== 'undefined') {
    if (!window.NFUtils) window.NFUtils = {};
    window.NFUtils.debounce = debounce;
    window.NFUtils.debounceConfigured = debounceConfigured;
}

export default debounce;

