/**
 * @fileoverview Centralized status and message display logic
 * @author danielknng
 * @module ui/status
 * @since 2025-01-XX
 * @version 2.0.0
 */

import { NF_CONFIG } from '../core/config.js';
import { dom } from './dom.js';
import { show, hide } from './helpers.js';

/**
 * Shows a persistent login hint message that remains until manually cleared
 * @param {string} msg - The hint message to display
 */
export function showPersistentLoginHint(msg) {
    if (dom.loginWarning) hide(dom.loginWarning);
    
    if (dom.loginHint) {
        dom.loginHint.textContent = msg;
        dom.loginHint.setAttribute('data-persistent', 'true');
        show(dom.loginHint);
    }
}

/**
 * Shows a status message with automatic timeout in the appropriate modal
 * @param {string} msg - The status message to display
 * @param {string} [type='success'] - Message type (success|error|info|warning)
 * @param {HTMLElement|string} [targetModal=null] - Target modal element or name (auto-detected if null)
 */
export function showStatus(msg, type = 'success', targetModal = null) {
    const duration = NF_CONFIG.ui.statusMessageDuration;
    if (!targetModal) {
        targetModal = getActiveModal();
    }
    
    // Special handling for login modal
    if (targetModal === 'login') {
        showLoginStatus(msg, type, duration);
        return;
    }
    
    const statusElement = getOrCreateStatusElement(targetModal);
    if (!statusElement) return;
    statusElement.textContent = msg;
    statusElement.className = `nf-status-msg${getStatusClass(type)}`;
    applyStatusStyling(statusElement, type);
    show(statusElement);
    setTimeout(() => hide(statusElement), duration);
}

/**
 * Shows login status message
 * @private
 * @param {string} msg - Message text
 * @param {string} type - Message type
 * @param {number} duration - Duration in ms
 */
function showLoginStatus(msg, type, duration) {
    let targetElement;
    switch (type) {
        case 'info':
            targetElement = dom.loginHint;
            if (dom.loginWarning) hide(dom.loginWarning);
            if (dom.loginLockout) hide(dom.loginLockout);
            break;
        case 'warning':
        case 'error':
            targetElement = dom.loginWarning;
            if (dom.loginLockout) hide(dom.loginLockout);
            if (dom.loginHint && !dom.loginHint.getAttribute('data-persistent')) {
                hide(dom.loginHint);
            }
            break;
        case 'lockout':
            targetElement = dom.loginLockout;
            if (dom.loginHint) hide(dom.loginHint);
            if (dom.loginWarning) hide(dom.loginWarning);
            break;
        default:
            targetElement = dom.loginHint;
            if (dom.loginWarning) hide(dom.loginWarning);
            if (dom.loginLockout) hide(dom.loginLockout);
    }
    
    if (targetElement) {
        targetElement.textContent = msg;
        show(targetElement);
        if (duration > 0) {
            setTimeout(() => hide(targetElement), duration);
        }
    }
}

/**
 * Gets the currently active modal
 * @private
 * @returns {string} Modal name
 */
function getActiveModal() {
    const modals = [
        { element: dom.loginContainer, name: 'login' },
        { element: dom.newTicketContainer, name: 'newticket' },
        { element: dom.ticketDetailContainer, name: 'ticketdetail' },
        { element: dom.ticketListContainer, name: 'ticketlist' }
    ];
    for (const modal of modals) {
        if (modal.element && !modal.element.classList.contains('nf-hidden')) {
            return modal.name;
        }
    }
    return 'main';
}

/**
 * Gets status CSS class for type
 * @private
 * @param {string} type - Message type
 * @returns {string} CSS class
 */
function getStatusClass(type) {
    return type === 'error' ? ' nf-error' :
           type === 'warning' ? ' nf-warning' :
           type === 'info' ? ' nf-info' : '';
}

/**
 * Applies status styling to element
 * @private
 * @param {HTMLElement} element - Element to style
 * @param {string} type - Message type
 */
function applyStatusStyling(element, type) {
    const styles = {
        error: { background: '#dc3545', border: '2px solid #c0392b', color: 'white' },
        warning: { background: '#ffc107', color: '#2d2d5a' },
        info: { background: '#17a2b8', color: 'white' },
        success: { background: '#28a745', color: 'white' }
    };
    const style = styles[type] || styles.success;
    Object.assign(element.style, style);
}

/**
 * Gets or creates status element for modal
 * @param {string} modalType - Modal type name
 * @returns {HTMLElement|null} Status element or null
 */
export function getOrCreateStatusElement(modalType) {
    const modalContainers = {
        'login': dom.loginContainer,
        'newticket': dom.newTicketContainer,
        'ticketdetail': dom.ticketDetailContainer,
        'ticketlist': dom.ticketListContainer,
        'main': dom.start
    };
    const container = modalContainers[modalType];
    if (!container) return null;
    
    let statusElement = container.querySelector('.nf-status-msg');
    if (!statusElement) {
        return null;
    }
    return statusElement;
}

/**
 * Clears login status messages
 * @param {string} type - The type of message to clear ('warning', 'info', 'lockout', 'all')
 */
export function clearLoginStatus(type = 'all') {
    if (type === 'all' || type === 'info') {
        if (dom.loginHint) hide(dom.loginHint);
    }
    if (type === 'all' || type === 'warning') {
        if (dom.loginWarning) hide(dom.loginWarning);
    }
    if (type === 'all' || type === 'lockout') {
        if (dom.loginLockout) hide(dom.loginLockout);
    }
}

/**
 * Clears persistent login hint
 */
export function clearPersistentLoginHint() {
    if (dom.loginHint) {
        dom.loginHint.removeAttribute('data-persistent');
        hide(dom.loginHint);
    }
}


