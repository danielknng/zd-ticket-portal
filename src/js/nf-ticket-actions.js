// Author: Daniel Könning
// ===============================
// nf-ticket-actions.js - Ticket actions and interactions
// ===============================
// This file contains all functions for user interactions with tickets.
// It handles the reply interface, closing tickets, sending replies,
// and managing the reply box.

// ===============================
// REPLY INTERFACE SETUP AND MANAGEMENT
// ===============================

/**
 * Sets up the reply user interface for ticket replies
 * Creates toggle button, configures reply box, and sets event handlers
 */
function nfSetupReplyInterface() {
    // ===============================
    // REPLY TOGGLE BUTTON SETUP
    // ===============================
    let replyToggle = document.getElementById('nf_ticketdetail_replytoggle');
    
    // Create toggle button if not present
    if (!replyToggle) {
        replyToggle = document.createElement('button');
        replyToggle.id = 'nf_ticketdetail_replytoggle';               // Unique ID for later reference
        replyToggle.className = 'nf-ticketdetail-replytoggle';        // CSS class for styling
        replyToggle.textContent = NF_CONFIG.getLabels(NF_CONFIG.currentLanguage).ticketDetailActions.reply;
        // Insert button before the reply box in the container
        nf.ticketDetailContainer.insertBefore(replyToggle, nf.ticketDetailReplyBox);
    }
    
    // ===============================
    // INITIAL STATE
    // ===============================
    replyToggle.style.display = '';                           // Show toggle button
    nf.ticketDetailReplyBox.classList.remove('nf-active');    // Remove active class from reply box
    nf.ticketDetailReplyBox.style.display = 'none';           // Hide reply box initially
    
    // ===============================
    // TOGGLE BUTTON EVENT HANDLER
    // ===============================
    replyToggle.onclick = function() {
        replyToggle.style.display = 'none';                   // Hide toggle button
        nf.ticketDetailReplyBox.classList.add('nf-active');   // Visually activate reply box
        nf.ticketDetailReplyBox.style.display = '';           // Show reply box
        nf.ticketDetailReplyInput.focus();                    // Set focus on input field
    };
    
    // ===============================
    // REPLY BOX BUTTON EVENT HANDLERS
    // ===============================
    // Setup for send and cancel buttons in the reply box
    let replyBtn = nf.ticketDetailReplyBox.querySelector('#nf_ticketdetail_replybtn');
    let cancelBtn = nf.ticketDetailReplyBox.querySelector('#nf_ticketdetail_replycancel');
    
    // Assign event handlers for reply functionality
    if (replyBtn) replyBtn.onclick = nfHandleReplySend;       // Send button
    if (cancelBtn) cancelBtn.onclick = nfHandleReplyCancel;   // Cancel button
}

// ===============================
// TICKET REPLY SENDING AND PROCESSING
// ===============================

/**
 * Sends a reply in the ticket detail via the reply box
 * Validates input, sends API request, and updates the view
 */
async function nfHandleReplySend() {
    // ===============================
    // INPUT VALIDATION
    // ===============================
    const text = nf.ticketDetailReplyInput.value.trim();
    if (!text) return;
    nfSetLoading(true);
    try {
        // ===============================
        // API CALL FOR REPLY
        // ===============================
        const ticketId = nf.ticketDetailContainer.getAttribute('data-ticket-id');
        await nfSendReply(ticketId, text);
        // ===============================
        // CACHE INVALIDATION
        // ===============================
        // Invalidate cache for this ticket so the new reply is visible on reload
        if (typeof nfCache !== 'undefined') {
            nfCache.invalidate(`ticket_detail_${ticketId}`);
            if (typeof nfLogger !== 'undefined') {
                nfLogger.debug('Ticket detail cache invalidated after reply', { ticketId });
            }
        }
        // ===============================
        // SUCCESS FEEDBACK AND UI RESET
        // ===============================
        nfShowStatus('Reply sent!', 'success', 'ticketdetail');
        nf.ticketDetailReplyInput.value = '';
        nf.ticketDetailReplyBox.classList.remove('nf-active');
        nf.ticketDetailReplyBox.style.display = 'none';
        // ===============================
        // SHOW TOGGLE BUTTON AGAIN
        // ===============================
        const replyToggle = document.getElementById('nf_ticketdetail_replytoggle');
        if (replyToggle) replyToggle.style.display = '';
        // ===============================
        // UPDATE TICKET VIEW
        // ===============================
        await nfShowTicketDetailView(ticketId);
    } catch (err) {
        // ===============================
        // ERROR HANDLING
        // ===============================
        nfShowStatus('Error sending reply: ' + err.message, 'error', 'ticketdetail');
    } finally {
        // ===============================
        // CLEANUP
        // ===============================
        nfSetLoading(false);
    }
}

// ===============================
// REPLY CANCEL AND UI RESET
// ===============================

/**
 * Cancels the reply in the ticket detail and resets the UI
 * Hides reply box and shows the "Reply" toggle button again
 */
function nfHandleReplyCancel() {
    // ===============================
    // DEACTIVATE REPLY BOX
    // ===============================
    nf.ticketDetailReplyBox.classList.remove('nf-active');
    nf.ticketDetailReplyBox.style.display = 'none';
    // ===============================
    // SHOW TOGGLE BUTTON AGAIN
    // ===============================
    const replyToggle = document.getElementById('nf_ticketdetail_replytoggle');
    if (replyToggle) replyToggle.style.display = '';
}

// ===============================
// CLOSE TICKET AND CHANGE STATUS
// ===============================

/**
 * Closes a ticket by setting its status to 'Closed'
 * Executes API call and updates the user interface
 */
async function nfHandleCloseTicket() {
    // ===============================
    // TICKET ID VALIDATION
    // ===============================
    const ticketId = nf.ticketDetailContainer.getAttribute('data-ticket-id');
    if (!ticketId) return;
    nfSetLoading(true);
    try {
        // ===============================
        // API CALL TO CLOSE
        // ===============================
        await nfCloseTicket(ticketId);
        // ===============================
        // CACHE INVALIDATION
        // ===============================
        // Invalidate both ticket details and ticket list
        if (typeof nfCache !== 'undefined') {
            nfCache.invalidate(`ticket_detail_${ticketId}`);
            nfCache.invalidate(`tickets_${nf.userId}`);
            if (typeof nfLogger !== 'undefined') {
                nfLogger.debug('Cache invalidated after ticket close', { ticketId });
            }
        }
        // ===============================
        // SUCCESS FEEDBACK AND NAVIGATION
        // ===============================
        nfShowStatus('Ticket marked as resolved.', 'success', 'ticketdetail');
        nfShowTicketList();
    } catch (err) {
        // ===============================
        // ERROR HANDLING
        // ===============================
        nfShowStatus('Error marking as resolved: ' + err.message, 'error', 'ticketdetail');
    } finally {
        // ===============================
        // CLEANUP
        // ===============================
        nfSetLoading(false);
    }
}
