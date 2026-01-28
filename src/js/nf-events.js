/**
 * @fileoverview Event handlers and DOM initialization for the ticket system
 * @author danielknng
 * @module NFEvents
 * @since 2025-07-15
 * @version 1.0.0
 */

import { nf } from './nf-dom.js';
import { handleNewTicketSubmit } from './nf-ticket-create.js';
import { nfShowStatus } from './nf-status.js';
import { nfUpdateFilePreview, nfClearFilePreview, nfInitializeDragAndDrop } from './nf-file-upload.js';
import nfModal from './nf-modal.js';
import { nfShowStart, nfRequireLogin, nfShowTicketList, nfShowNewTicket, nfHideAll, nfResetLoginState } from './nf-ui.js';
import { nfHideSearchDropdown, nfInitializeSearch } from './nf-search.js';
import { nfLoadAndShowTicketList } from './nf-ticket-list.js';
import { nfHandleCloseTicket } from './nf-ticket-actions.js';

/**
 * Extended event handlers for the global nf object.
 * These methods handle user interactions and modal navigation throughout the application.
 * @namespace nf.eventHandlers
 */
Object.assign(nf, {
    /**
     * Handles closing modals via X button (event delegation)
     * Automatically detects which modal is being closed and navigates accordingly
     *
     * @param {Event} e - Click event from the X button
     */
    handleModalClose: function(e) {
        if (e.target.classList.contains('nf-modal-closebtn')) {
            e.preventDefault();
            const modal = e.target.closest('.nf-ticketdetail-container, .nf-ticketlist-container, .nf-newticket-container, .nf-login-container, .nf-modal-centerbox');
            if (!modal) return;
            nfModal.close(modal);
            if (modal.classList.contains('nf-ticketdetail-container')) {
                nfShowTicketList();
            } else if (modal.classList.contains('nf-ticketlist-container')) {
                nfShowStart();
            } else if (modal.classList.contains('nf-newticket-container')) {
                nfShowStart();
            } else if (modal.classList.contains('nf-login-container')) {
                nfResetLoginState();
                nfShowStart();
            } else if (modal.classList.contains('nf-modal-centerbox')) {
                nfHideAll();
            }
        }
    },

    /**
     * Handles keyboard accessibility for modal close buttons
     * Enables Enter and Space keys to trigger close button functionality
     *
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleModalCloseKeyboard: function(e) {
        if (e.target.classList.contains('nf-modal-closebtn') && 
            (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            e.target.click(); // Trigger the click event which will be handled by handleModalClose
        }
    },
    /**
     * Handles ESC key for intuitive modal navigation
     * ESC always closes the currently visible modal and navigates one level back
     * Priority: Gallery > Search > Form Fields > Modals (ticket detail > ticket list > main)
     *
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleEscKey: function(e) {
        if (e.key === 'Escape') {
            // Prevent default and stop propagation to avoid multiple handlers
            e.preventDefault();
            e.stopPropagation();
            
            // Priority 1: Gallery overlay (highest priority)
            const galleryOverlay = document.getElementById('nf_gallery_overlay');
            if (galleryOverlay && galleryOverlay.classList.contains('nf-gallery-active')) {
                // Import and call gallery close function
                if (window.nfCloseGallery) {
                    window.nfCloseGallery();
                }
                return; // Stop here, don't close anything else
            }
            
            // Priority 2: Search dropdown
            if (nf.searchDropdown && nf.searchDropdown.style.display === 'block') {
                nfHideSearchDropdown();
                return;
            }
            
            // Priority 3: Form field focus (blur active form elements)
            if (nf.filterStatus && nf.filterStatus === document.activeElement) {
                nf.filterStatus.blur();
                return;
            }
            if (nf.sort && nf.sort === document.activeElement) {
                nf.sort.blur();
                return;
            }
            
            // Priority 4: Modal navigation (ticket detail > ticket list > main)
            // Check visibility using both nf-hidden class and computed style
            if (nf.ticketDetailContainer && 
                !nf.ticketDetailContainer.classList.contains('nf-hidden') &&
                window.getComputedStyle(nf.ticketDetailContainer).display !== 'none') {
                nfModal.close(nf.ticketDetailContainer);
                nfShowTicketList();
                return; // Stop here
            }
            
            if (nf.ticketListContainer && 
                !nf.ticketListContainer.classList.contains('nf-hidden') &&
                window.getComputedStyle(nf.ticketListContainer).display !== 'none') {
                nfModal.close(nf.ticketListContainer);
                nfShowStart();
                return; // Stop here
            }
            
            if (nf.newTicketContainer && 
                !nf.newTicketContainer.classList.contains('nf-hidden') &&
                window.getComputedStyle(nf.newTicketContainer).display !== 'none') {
                nfModal.close(nf.newTicketContainer);
                nfShowStart();
                return; // Stop here
            }
            
            if (nf.loginContainer && 
                !nf.loginContainer.classList.contains('nf-hidden') &&
                window.getComputedStyle(nf.loginContainer).display !== 'none') {
                nfModal.close(nf.loginContainer);
                nfResetLoginState();
                nfShowStart();
                return; // Stop here
            }
        }
    },
    /**
     * Handles the cancel button in the new ticket modal
     * Navigates back to the main menu without saving
     *
     * @param {Event} e - Click event from the cancel button
     */
    handleCancelNewTicket: function(e) {
        e.preventDefault();
        nf.newTicketForm.reset();
        nfClearFilePreview();
        nfShowStart();
    },
    /**
     * Handles submitting the new ticket form
     * Performs full validation, file upload, and API call
     *
     * @param {Event} e - Submit event from the form
     */
    handleNewTicketSubmit: handleNewTicketSubmit,
});

/**
 * Initializes all event listeners for the ticket system
 * This function is called on DOM load and connects all
 * HTML elements with their corresponding event handler functions
 */
function nfInitializeEventListeners() {
    if (nf.trigger) {
        nf.trigger.addEventListener('click', () => {
            window.nfLogger.debug('Main trigger button clicked - opening ticket system');
            nfShowStart();
        });
    }
    if (nf.btnTicketCreate) {
        nf.btnTicketCreate.addEventListener('click', () => {
            window.nfLogger.debug('Create ticket button clicked');
            nfRequireLogin(nfShowNewTicket);
        });
    }
    if (nf.btnTicketView) {
        nf.btnTicketView.addEventListener('click', async () => {
            window.nfLogger.debug('View tickets button clicked');
            nfRequireLogin(async () => {
                window.nfLogger.debug('nfRequireLogin callback for btnTicketView starting');
                await nfLoadAndShowTicketList();
            });
        });
    }
    
    if (nf.newTicketForm) {
        nf.newTicketForm.addEventListener('submit', nf.handleNewTicketSubmit);
    }
    if (nf.btnCancelNewTicket) {
        nf.btnCancelNewTicket.addEventListener('click', nf.handleCancelNewTicket);
    }
    
    if (nf.newTicketAttachment) {
        nf.newTicketAttachment.addEventListener('change', nfUpdateFilePreview);
        nfInitializeDragAndDrop();
    }
    
    const closeBtn = document.getElementById('nf_ticketdetail_closebtn');
    if (closeBtn) {
        closeBtn.onclick = nfHandleCloseTicket;
    }
    
    document.addEventListener('click', nf.handleModalClose);
    document.addEventListener('keydown', nf.handleEscKey);
    document.addEventListener('keydown', nf.handleModalCloseKeyboard);
    nfInitializeSearch();
}

/**
 * Main initialization after DOM load
 * Starts the complete event system when DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    window.nfLogger.debug('DOM loaded - initializing event listeners and application');
    nfInitializeEventListeners();
    window.nfLogger.debug('Event listeners initialized - application ready');
});
