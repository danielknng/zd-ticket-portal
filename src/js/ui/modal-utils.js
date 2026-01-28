/**
 * @fileoverview Modal utilities to eliminate duplication
 * @author danielknng
 * @module ui/modal-utils
 * @since 2025-01-XX
 * @version 2.0.0
 */

import { MODAL_IDS } from '../core/constants.js';

/**
 * Modal utilities to eliminate 6+ duplications of MODAL_IDS.forEach pattern
 * @namespace ModalUtils
 */
export const ModalUtils = {
    /**
     * Iterates over all modals and calls callback for each
     * @param {Function} callback - Callback function (element, id)
     */
    forEachModal(callback) {
        MODAL_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) callback(el, id);
        });
    },

    /**
     * Gets a modal element by ID
     * @param {string} id - Modal ID
     * @returns {HTMLElement|null} Modal element or null
     */
    getModal(id) {
        return document.getElementById(id);
    },

    /**
     * Gets all modal elements
     * @returns {Array<HTMLElement>} Array of modal elements
     */
    getAllModals() {
        return MODAL_IDS.map(id => document.getElementById(id)).filter(el => el !== null);
    }
};

export default ModalUtils;

