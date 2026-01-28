// Author: Daniel Könning
// ===============================
// nf-events.js - Event handlers and DOM initialization
// ===============================
// This file defines all event handlers for user interactions
// and initializes the complete event system after DOM load.
// It extends the global nf object with event handling methods.

// ===============================
// EXTENDED EVENT HANDLERS FOR THE NF OBJECT
// ===============================
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
            // ===============================
            // MODAL CONTAINER IDENTIFICATION
            // ===============================
            const modal = e.target.closest('.nf-ticketdetail-container, .nf-ticketlist-container, .nf-newticket-container, .nf-login-container, .nf-modal-centerbox');
            if (!modal) return;
            // ===============================
            // MODAL-SPECIFIC NAVIGATION
            // ===============================
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
     * Handles ESC key for intuitive modal navigation
     * ESC always closes the currently visible modal and navigates one level back
     *
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleEscKey: function(e) {
        if (e.key === 'Escape') {
            // Check gallery first
            const galleryOverlay = document.getElementById('nf_gallery_overlay');
            if (galleryOverlay && !galleryOverlay.classList.contains('nf-hidden')) {
                return;
            }
            // Check search dropdown
            if (nf.searchDropdown && nf.searchDropdown.style.display === 'block') {
                nfHideSearchDropdown();
                return;
            }
            // Check ticketlist filter/sort dropdowns
            if (nf.filterStatus && nf.filterStatus === document.activeElement) {
                nf.filterStatus.blur();
                return;
            }
            if (nf.sort && nf.sort === document.activeElement) {
                nf.sort.blur();
                return;
            }
            // Check modal hierarchy (only close the currently visible modal)
            if (nf.ticketDetailContainer && !nf.ticketDetailContainer.classList.contains('nf-hidden')) {
                nfShowTicketList();
            } else if (nf.ticketListContainer && !nf.ticketListContainer.classList.contains('nf-hidden')) {
                nfShowStart();
            } else if (nf.newTicketContainer && !nf.newTicketContainer.classList.contains('nf-hidden')) {
                nfShowStart();
            } else if (nf.loginContainer && !nf.loginContainer.classList.contains('nf-hidden')) {
                nfResetLoginState();
                nfShowStart();
            } else if (nf.start && !nf.start.classList.contains('nf-hidden')) {
                // Main menu open: do not automatically close everything!
                // nfHideAll();
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
    handleNewTicketSubmit: async function(e) {
        e.preventDefault();
        nfSetLoading(true);
        try {
            // ===============================
            // COLLECT FORM DATA
            // ===============================
            const subject = nf.newTicketSubject.value.trim();
            const body = nf.newTicketBody.value.trim();
            const files = nf.newTicketAttachment.files;
            // ===============================
            // REQUIRED FIELD VALIDATION
            // ===============================
            if (!subject || !body) {
                throw new NFError(nfGetMessage('missingFields'), 'MISSING_FIELDS');
            }
            // ===============================
            // FILE VALIDATION
            // ===============================
            if (files && files.length > 0) {
                for (const file of files) {
                    try {
                        NFUtils.validateFile(file);
                    } catch (error) {
                        throw new NFError(nfGetMessage('fileValidationFailed', undefined, { file: file.name, error: error.message }), 'FILE_VALIDATION_FAILED');
                    }
                }
            }
            nfLogger.info('Creating ticket', { subject, hasFiles: files.length > 0 });
            // ===============================
            // API CALL TO CREATE TICKET
            // ===============================
            await nfCreateTicket(subject, body, files);
            nfShowStatus(nfGetMessage('ticketCreated'), 'success', 'newticket');
            // ===============================
            // CACHE INVALIDATION
            // ===============================
            nfCache.invalidate(`tickets_${nf.userId}`);
            // ===============================
            // RESET FORM
            // ===============================
            nf.newTicketForm.reset();
            nfClearFilePreview();
            // ===============================
            // NAVIGATION AFTER SUCCESS
            // ===============================
            nfShowStart();
        } catch (error) {
            // ===============================
            // ERROR HANDLING
            // ===============================
            nfLogger.error('Failed to create ticket', { error: error.message });
            nfShowStatus(error.message || 'Error creating ticket', 'error', 'newticket');
        } finally {
            // ===============================
            // CLEANUP
            // ===============================
            nfSetLoading(false);
        }
    }
});
// ===============================
// EVENT LISTENER INITIALIZATION
// ===============================
/**
 * Initializes all event listeners for the ticket system
 * This function is called on DOM load and connects all
 * HTML elements with their corresponding event handler functions
 */
function nfInitializeEventListeners() {
    // ===============================
    // MAIN TRIGGER (Open system)
    // ===============================
    if (nf.trigger) {
        nf.trigger.addEventListener('click', nfShowStart);
    }
    // ===============================
    // MAIN MENU BUTTONS
    // ===============================
    if (nf.btnTicketCreate) {
        nf.btnTicketCreate.addEventListener('click', () => {
            nfRequireLogin(nfShowNewTicket);
        });
    }
    if (nf.btnTicketView) {
        nf.btnTicketView.addEventListener('click', async () => {
            nfRequireLogin(async () => {
                await nfLoadAndShowTicketList();
            });
        });
    }
    // ===============================
    // FORM EVENT HANDLERS
    // ===============================
    if (nf.newTicketForm) {
        nf.newTicketForm.addEventListener('submit', nf.handleNewTicketSubmit);
    }
    if (nf.btnCancelNewTicket) {
        nf.btnCancelNewTicket.addEventListener('click', nf.handleCancelNewTicket);
    }
    // File upload preview handler
    if (nf.newTicketAttachment) {
        nf.newTicketAttachment.addEventListener('change', nfUpdateFilePreview);
        nfInitializeDragAndDrop();
    }
    // TICKET ACTION BUTTONS (OPTIONAL)
    const closeBtn = document.getElementById('nf_ticketdetail_closebtn');
    if (closeBtn) {
        closeBtn.onclick = nfHandleCloseTicket;
    }
    // GLOBAL EVENT DELEGATION
    document.addEventListener('click', nf.handleModalClose);
    document.addEventListener('keydown', nf.handleEscKey);
    // SEARCH FUNCTIONALITY
    nfInitializeSearch();
}
// ===============================
// DOM READY AND MAIN INITIALIZATION
// ===============================
/**
 * Main initialization after DOM load
 * Starts the complete event system when DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    nfInitializeEventListeners();
});
