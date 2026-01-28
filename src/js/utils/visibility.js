/**
 * @fileoverview Visibility utility to eliminate duplication
 * @author danielknng
 * @module utils/visibility
 * @since 2025-01-XX
 * @version 2.0.0
 */

/**
 * Checks if a modal/container is visible
 * Eliminates 4+ duplications of visibility check pattern
 * 
 * @param {HTMLElement} container - Container element to check
 * @returns {boolean} true if visible
 */
export function isModalVisible(container) {
    if (!container) return false;
    return !container.classList.contains('nf-hidden') && 
           window.getComputedStyle(container).display !== 'none';
}

export default isModalVisible;

