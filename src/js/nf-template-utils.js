/**
 * @fileoverview Safe template cloning utilities
 * @author danielknng
 * @module NFTemplateUtils
 * @since 2025-07-15
 * @version 1.0.0
 */

/**
 * Safely clones a template element by selector or reference.
 * Supports both HTMLTemplateElement and regular HTML elements.
 * 
 * @param {string|HTMLElement} template - CSS selector string or template element reference
 * @returns {HTMLElement|null} Deep-cloned template element or null if template is missing
 * @example
 * // Clone by selector
 * const clone = nfCloneTemplate('#my-template');
 * 
 * // Clone by element reference
 * const template = document.getElementById('my-template');
 * const clone = nfCloneTemplate(template);
 */
export function nfCloneTemplate(template) {
    let tpl = template;
    if (typeof template === 'string') {
        tpl = document.querySelector(template);
    }
    if (tpl && tpl.content) {
        // HTMLTemplateElement
        return tpl.content.firstElementChild.cloneNode(true);
    } else if (tpl && tpl.cloneNode) {
        // Any other element
        return tpl.cloneNode(true);
    } else {
        // No fallback: return null
        return null;
    }
}
