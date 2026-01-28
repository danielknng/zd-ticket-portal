/**
 * @fileoverview Centralized modal logic for dialog management
 * @author danielknng
 * @module ui/modal
 * @since 2025-01-XX
 * @version 2.0.0
 */

import { FocusUtils } from '../utils/focus.js';
import { ModalUtils } from './modal-utils.js';

/**
 * Modal management object providing centralized modal functionality.
 * Handles opening, closing, blur effects, focus trapping, and accessibility.
 * 
 * @namespace Modal
 */
export const Modal = {
    /**
     * Opens a modal by element or ID
     * @param {HTMLElement|string} modal - Modal element or its ID
     */
    open(modal) {
        const el = typeof modal === 'string' ? document.getElementById(modal) : modal;
        if (!el) return;
        
        // Remove any existing blur from the modal being opened
        el.classList.remove('nf-blur-bg');
        
        el.classList.remove('nf-hidden');
        el.setAttribute('aria-hidden', 'false');
        this.setAriaHiddenExcept(el.id);
        this.setInertExcept(el.id);
        this.focusTrap(el);
        FocusUtils.focusFirst(el);
        this.blurBackground(el);
    },

    /**
     * Closes a modal by element or ID
     * @param {HTMLElement|string} modal - Modal element or its ID
     */
    close(modal) {
        const el = typeof modal === 'string' ? document.getElementById(modal) : modal;
        if (!el) return;
        el.classList.add('nf-hidden');
        el.setAttribute('aria-hidden', 'true');
        this.removeFocusTrap(el);
        this.unblurBackground(el);
        this.setInertExcept(null);
    },

    /**
     * Adds a focus trap to the modal
     * @param {HTMLElement} modal
     */
    focusTrap(modal) {
        const focusable = FocusUtils.getFocusableElements(modal);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        modal._focusTrapHandler = function(e) {
            if (e.key === 'Tab') {
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        modal.addEventListener('keydown', modal._focusTrapHandler);
    },

    /**
     * Removes the focus trap from the modal
     * @param {HTMLElement} modal
     */
    removeFocusTrap(modal) {
        if (modal._focusTrapHandler) {
            modal.removeEventListener('keydown', modal._focusTrapHandler);
            delete modal._focusTrapHandler;
        }
    },

    /**
     * Blurs the background when modal is open
     * @param {HTMLElement} modal
     */
    blurBackground(modal) {
        const currentModalId = modal.id;
        ModalUtils.forEachModal((el, id) => {
            if (id !== currentModalId) {
                el.classList.add('nf-blur-bg');
            }
        });
    },

    /**
     * Removes background blur
     * @param {HTMLElement} modal
     */
    unblurBackground(modal) {
        ModalUtils.forEachModal((el) => {
            el.classList.remove('nf-blur-bg');
        });
    },

    /**
     * Sets aria-hidden on all modals except the given one
     * @param {string} modalId
     */
    setAriaHiddenExcept(modalId) {
        ModalUtils.forEachModal((el, id) => {
            if (id === modalId) {
                el.setAttribute('aria-hidden', 'false');
            } else {
                el.setAttribute('aria-hidden', 'true');
            }
        });
        // Additionally hide main content outside the modals
        const mainContent = document.querySelector('body > :not(.nf-modal-overlay):not(.nf-ticketlist-container):not(.nf-ticketdetail-container):not(.nf-gallery-overlay):not(.nf-login-container):not(.nf-newticket-container)');
        if (mainContent) mainContent.setAttribute('aria-hidden', 'true');
    },

    /**
     * Sets 'inert' on all modals except the given one
     * @param {string|null} modalId
     */
    setInertExcept(modalId) {
        ModalUtils.forEachModal((el, id) => {
            if (modalId && id === modalId) {
                el.removeAttribute('inert');
            } else {
                el.setAttribute('inert', '');
            }
        });
        // Additionally set inert on main content outside the modals
        const mainContent = document.querySelector('body > :not(.nf-modal-overlay):not(.nf-ticketlist-container):not(.nf-ticketdetail-container):not(.nf-gallery-overlay):not(.nf-login-container):not(.nf-newticket-container)');
        if (mainContent) {
            if (modalId) {
                mainContent.setAttribute('inert', '');
            } else {
                mainContent.removeAttribute('inert');
            }
        }
    }
};


export default Modal;

