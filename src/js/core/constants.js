/**
 * @fileoverview Application-wide constants
 * @author danielknng
 * @module core/constants
 * @since 2025-01-XX
 * @version 2.0.0
 */

/**
 * Timing constants for UI transitions and delays
 * @constant {Object} TIMING_CONSTANTS
 */
export const TIMING_CONSTANTS = {
    TRANSITION_DURATION_MS: 300,
    RETRY_DELAY_MS: 500,
    IMAGE_LOAD_TIMEOUT_MS: 2000,
    LANGUAGE_LOAD_TIMEOUT_MS: 2000,
    CONFIG_REINIT_DELAY_MS: 100
};

/**
 * Current year constant (memoized to avoid repeated Date calculations)
 * @constant {number} CURRENT_YEAR
 */
export const CURRENT_YEAR = new Date().getFullYear();

/**
 * Array of all modal container IDs used throughout the application
 * @constant {Array<string>} MODAL_IDS
 */
export const MODAL_IDS = [
    'nf_modal_overlay',
    'nf_ticketlist_container',
    'nf_ticketdetail_container',
    'nf_gallery_overlay',
    'nf_login_container',
    'nf_new_ticket_container'
];

