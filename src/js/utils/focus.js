/**
 * @fileoverview Focus utilities to eliminate duplication
 * @author danielknng
 * @module utils/focus
 * @since 2025-01-XX
 * @version 2.0.0
 */

/**
 * Focus utilities to eliminate 3+ duplications of focusable element queries
 * @namespace FocusUtils
 */
export const FocusUtils = {
    /**
     * Gets all focusable elements within a container
     * @param {HTMLElement} container - Container element
     * @returns {NodeList} List of focusable elements
     */
    getFocusableElements(container) {
        return container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
    },

    /**
     * Focuses the first focusable element in a container
     * @param {HTMLElement} container - Container element
     */
    focusFirst(container) {
        const focusable = this.getFocusableElements(container);
        if (focusable.length) {
            focusable[0].focus();
        } else {
            container.focus();
        }
    }
};

export default FocusUtils;

