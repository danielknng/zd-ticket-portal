/**
 * @fileoverview Centralized status and message display logic
 * @author danielknng
 * @module NFStatus
 * @since 2025-07-15
 * @version 1.0.0
 */

import { NF_CONFIG } from './nf-config.js';
import { nf } from './nf-dom.js';
import { nfShow, nfHide } from './nf-helpers.js';

/**
 * Shows a persistent login hint message that remains until manually cleared
 * @param {string} msg - The hint message to display
 */
export function nfShowPersistentLoginHint(msg) {
    // Hide all login status elements first except lockout (which should persist)
    if (nf.loginWarning) nfHide(nf.loginWarning);
    
    if (nf.loginHint) {
        nf.loginHint.textContent = msg;
        nf.loginHint.setAttribute('data-persistent', 'true'); // Mark as persistent
        nfShow(nf.loginHint);
        // No timeout - this hint should persist
    }
}

/**
 * Shows a status message with automatic timeout in the appropriate modal
 * @param {string} msg - The status message to display
 * @param {string} [type='success'] - Message type (success|error|info|warning)
 * @param {HTMLElement} [targetModal=null] - Target modal element (auto-detected if null)
 */
export function nfShowStatus(msg, type = 'success', targetModal = null) {
    const duration = NF_CONFIG.ui.statusMessageDuration;
    if (!targetModal) {
        targetModal = getActiveModal();
    }
    
    // Special handling for login modal
    if (targetModal === 'login') {
        showLoginStatus(msg, type, duration);
        return;
    }
    
    const statusElement = nfGetOrCreateStatusElement(targetModal);
    if (!statusElement) return;
    statusElement.textContent = msg;
    statusElement.className = `nf-status-msg${getStatusClass(type)}`;
    applyStatusStyling(statusElement, type);
    nfShow(statusElement);
    setTimeout(() => nfHide(statusElement), duration);
}

function showLoginStatus(msg, type, duration) {
    // Only hide elements that will be replaced, preserve persistent hints
    let targetElement;
    switch (type) {
        case 'info':
            targetElement = nf.loginHint;
            // Hide other elements but not the hint we're about to show
            if (nf.loginWarning) nfHide(nf.loginWarning);
            if (nf.loginLockout) nfHide(nf.loginLockout);
            break;
        case 'warning':
        case 'error':
            targetElement = nf.loginWarning;
            // Don't hide persistent hints, only hide lockout
            if (nf.loginLockout) nfHide(nf.loginLockout);
            // Only hide hint if it's not marked as persistent
            if (nf.loginHint && !nf.loginHint.getAttribute('data-persistent')) {
                nfHide(nf.loginHint);
            }
            break;
        case 'lockout':
            targetElement = nf.loginLockout;
            // Hide all others for lockout (serious state)
            if (nf.loginHint) nfHide(nf.loginHint);
            if (nf.loginWarning) nfHide(nf.loginWarning);
            break;
        default:
            targetElement = nf.loginHint;
            if (nf.loginWarning) nfHide(nf.loginWarning);
            if (nf.loginLockout) nfHide(nf.loginLockout);
    }
    
    if (targetElement) {
        targetElement.textContent = msg;
        nfShow(targetElement);
        if (duration > 0) {
            setTimeout(() => nfHide(targetElement), duration);
        }
    }
}

function getActiveModal() {
    const modals = [
        { element: nf.loginContainer, name: 'login' },
        { element: nf.newTicketContainer, name: 'newticket' },
        { element: nf.ticketDetailContainer, name: 'ticketdetail' },
        { element: nf.ticketListContainer, name: 'ticketlist' }
    ];
    for (const modal of modals) {
        if (modal.element && !modal.element.classList.contains('nf-hidden')) {
            return modal.name;
        }
    }
    return 'main';
}

function getStatusClass(type) {
    return type === 'error' ? ' nf-error' :
           type === 'warning' ? ' nf-warning' :
           type === 'info' ? ' nf-info' : '';
}

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

export function nfGetOrCreateStatusElement(modalType) {
    const modalContainers = {
        'login': nf.loginContainer,
        'newticket': nf.newTicketContainer,
        'ticketdetail': nf.ticketDetailContainer,
        'ticketlist': nf.ticketListContainer,
        'main': nf.start
    };
    const container = modalContainers[modalType];
    if (!container) return null;
    
    let statusElement = container.querySelector('.nf-status-msg');
    if (!statusElement) {
        // No fallback: do not create dynamically
        return null;
    }
    return statusElement;
}

/**
 * Clears login status messages
 * @param {string} type - The type of message to clear ('warning', 'info', 'lockout', 'all')
 */
export function nfClearLoginStatus(type = 'all') {
    if (type === 'all' || type === 'info') {
        if (nf.loginHint) nfHide(nf.loginHint);
    }
    if (type === 'all' || type === 'warning') {
        if (nf.loginWarning) nfHide(nf.loginWarning);
    }
    if (type === 'all' || type === 'lockout') {
        if (nf.loginLockout) nfHide(nf.loginLockout);
    }
}

export function nfClearPersistentLoginHint() {
    if (nf.loginHint) {
        nf.loginHint.removeAttribute('data-persistent');
        nfHide(nf.loginHint);
    }
}
