/**
 * @fileoverview Centralized modal logic for dialog management
 * @author danielknng
 * @module NFModal
 * @since 2025-07-15
 * @version 1.0.0
 */

/**
 * Modal management object providing centralized modal functionality.
 * Handles opening, closing, blur effects, focus trapping, and accessibility.
 * 
 * @namespace nfModal
 */
const nfModal = {
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
        this.setInertExcept(el.id); // NEW: set inert on background
        this.focusTrap(el);
        // Move focus to modal or first focusable element
        const focusable = el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length) {
            focusable[0].focus();
        } else {
            el.focus();
        }
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
        this.setInertExcept(null); // Remove inert from all
    },

    /**
     * Adds a focus trap to the modal
     * @param {HTMLElement} modal
     */
    focusTrap(modal) {
        const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
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
            // ESC key handling is now done by the main keyboard handler in nf-events.js
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
        // Blur all background modal layers except the topmost
        const currentModalId = modal.id;
        const ids = [
            'nf_modal_overlay',
            'nf_ticketlist_container',
            'nf_ticketdetail_container',
            'nf_gallery_overlay',
            'nf_login_container',
            'nf_new_ticket_container'
        ];
        ids.forEach(id => {
            const el = document.getElementById(id);
            // Only blur elements that exist and are not the current modal
            if (el && id !== currentModalId) {
                el.classList.add('nf-blur-bg');
            }
        });
    },

    /**
     * Removes background blur
     * @param {HTMLElement} modal
     */
    unblurBackground(modal) {
        const ids = [
            'nf_modal_overlay',
            'nf_ticketlist_container',
            'nf_ticketdetail_container',
            'nf_gallery_overlay',
            'nf_login_container',
            'nf_new_ticket_container'
        ];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.remove('nf-blur-bg');
            }
        });
    },

    /**
     * Sets aria-hidden on all modals except the given one
     * @param {string} modalId
     */
    setAriaHiddenExcept(modalId) {
        const ids = [
            'nf_modal_overlay',
            'nf_ticketlist_container',
            'nf_ticketdetail_container',
            'nf_gallery_overlay',
            'nf_login_container',
            'nf_new_ticket_container'
        ];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id === modalId) {
                    el.setAttribute('aria-hidden', 'false');
                } else {
                    el.setAttribute('aria-hidden', 'true');
                }
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
        const ids = [
            'nf_modal_overlay',
            'nf_ticketlist_container',
            'nf_ticketdetail_container',
            'nf_gallery_overlay',
            'nf_login_container',
            'nf_new_ticket_container'
        ];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (modalId && id === modalId) {
                    el.removeAttribute('inert');
                } else {
                    el.setAttribute('inert', '');
                }
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

window.nfModal = nfModal;
export default nfModal;
