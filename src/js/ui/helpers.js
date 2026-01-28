/**
 * @fileoverview Helper functions for UI manipulation and data processing
 * @author danielknng
 * @module ui/helpers
 * @since 2025-01-XX
 * @version 2.0.0
 */

import { dom } from './dom.js';
import languageManager from '../i18n/manager.js';

/**
 * Shows an element by removing the hidden class
 * @param {HTMLElement} el - Element to show
 */
export function show(el) {
    el?.classList.remove('nf-hidden');
}

/**
 * Hides an element by adding the hidden class
 * @param {HTMLElement} el - Element to hide
 */
export function hide(el) {
    el?.classList.add('nf-hidden');
}

/**
 * Controls the loading spinner visibility
 * @param {boolean} isLoading - Whether to show or hide the loader
 */
export function setLoading(isLoading) {
    isLoading ? show(dom.loader) : hide(dom.loader);
}

/**
 * Maps a ticket state ID or name to a readable status label using NF_CONFIG and current language
 * @param {number|string} state - The state ID (number) or state name (string)
 * @returns {string} The status label or empty string if not found
 */
export function stateLabel(state) {
    if (!languageManager) return '';
    
    const ticketStates = languageManager.getSystemData('ticketStates');
    // State can be a number or string (id or name)
    if (typeof state === 'number' && ticketStates[state]) return ticketStates[state];
    if (typeof state === 'string') {
        // Try as number string
        if (ticketStates[Number(state)]) return ticketStates[Number(state)];
        // Try as lowercased string key
        if (ticketStates[state.toLowerCase()]) return ticketStates[state.toLowerCase()];
    }
    // Fallback to unknown status label if available
    return languageManager.getLabel('unknownStatus') || '';
}

/**
 * Checks if a CSS style property is allowed
 * @param {string} style - CSS style property to check
 * @param {Array} allowedStyles - Array of allowed style properties
 * @returns {boolean} True if style is allowed
 */
export function isAllowedStyle(style, allowedStyles) {
    return allowedStyles.some(allowed => style.trim().startsWith(allowed));
}

/**
 * Checks if a CSS style contains problematic colors
 * @param {string} style - CSS style to check
 * @param {Array} problematicColors - Array of problematic color values
 * @returns {boolean} True if style contains problematic colors
 */
export function hasProblematicColor(style, problematicColors) {
    return problematicColors.some(color => style.includes(color));
}


