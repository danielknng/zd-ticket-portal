/**
 * @fileoverview Ticket actions and user interactions
 * @author danielknng
 * @module NFTicketActions
 * @since 2025-07-15
 * @version 1.0.0
 */

import { nf } from './nf-dom.js';
import { nfSetLoading } from './nf-helpers.js';
import { nfShowStatus } from './nf-status.js';
import { nfShowTicketList } from './nf-ui.js';
import { nfSendReply, nfCloseTicket } from './nf-api.js';
import { nfShowTicketDetailView } from './nf-ticket-detail.js';
import { 
    nfHandleAttachFiles, 
    nfHandleReplyAttachmentChange, 
    nfUpdateReplyFilePreview, 
    nfClearReplyFilePreview 
} from './nf-file-upload.js';

/**
 * Sets up the reply user interface for ticket replies
 * Creates toggle button, configures reply box, and sets event handlers
 */
function nfSetupReplyInterface() {
    let replyToggle = document.getElementById('nf_ticketdetail_replytoggle');
    
    replyToggle.style.display = '';
    nf.ticketDetailReplyBox.classList.remove('nf-active');
    nf.ticketDetailReplyBox.style.display = 'none';
    
    replyToggle.onclick = function() {
        replyToggle.style.display = 'none';
        nf.ticketDetailReplyBox.classList.add('nf-active');
        nf.ticketDetailReplyBox.style.display = '';
        nf.ticketDetailReplyInput.focus();
    };
    
    let replyBtn = nf.ticketDetailReplyBox.querySelector('#nf_ticketdetail_replybtn');
    let attachBtn = nf.ticketDetailReplyBox.querySelector('#nf_ticketdetail_attachbtn');
    let cancelBtn = nf.ticketDetailReplyBox.querySelector('#nf_ticketdetail_replycancel');
    
    // Assign event handlers for reply functionality
    if (replyBtn) replyBtn.onclick = nfHandleReplySend;       // Send button
    if (attachBtn) attachBtn.onclick = nfHandleAttachFiles;   // Attach files button
    if (cancelBtn) cancelBtn.onclick = nfHandleReplyCancel;   // Cancel button
    
    // Setup file input change handler
    if (nf.ticketDetailAttachment) {
        nf.ticketDetailAttachment.onchange = nfHandleReplyAttachmentChange;
    }
}

/**
 * Sends a reply in the ticket detail via the reply box
 * Validates input, sends API request, and updates the view
 */
async function nfHandleReplySend() {
    const text = nf.ticketDetailReplyInput.value.trim();
    if (!text) return;
    nfSetLoading(true);
    try {
        const ticketId = nf.ticketDetailContainer.getAttribute('data-ticket-id');
        const files = nf.ticketDetailAttachment?.files || null;
        await nfSendReply(ticketId, text, files);
        if (typeof window.nfCache !== 'undefined') {
            window.nfCache.invalidate(`ticket_detail_${ticketId}`);
            if (typeof window.nfLogger !== 'undefined') {
                window.nfLogger.debug('Ticket detail cache invalidated after reply', { ticketId });
            }
        }
        nfShowStatus('Reply sent!', 'success', 'ticketdetail');
        nf.ticketDetailReplyInput.value = '';
        nfClearReplyFilePreview();
        nf.ticketDetailReplyBox.classList.remove('nf-active');
        nf.ticketDetailReplyBox.style.display = 'none';
        const replyToggle = document.getElementById('nf_ticketdetail_replytoggle');
        if (replyToggle) replyToggle.style.display = '';
        await nfShowTicketDetailView(ticketId);
    } catch (err) {
        nfShowStatus('Error sending reply: ' + err.message, 'error', 'ticketdetail');
    } finally {
        nfSetLoading(false);
    }
}

/**
 * Cancels the reply in the ticket detail and resets the UI
 * Hides reply box and shows the "Reply" toggle button again
 */
function nfHandleReplyCancel() {
    nf.ticketDetailReplyBox.classList.remove('nf-active');
    nf.ticketDetailReplyBox.style.display = 'none';
    
    nfClearReplyFilePreview();
    
    const replyToggle = document.getElementById('nf_ticketdetail_replytoggle');
    if (replyToggle) replyToggle.style.display = '';
}

/**
 * Closes a ticket by setting its status to 'Closed'
 * Executes API call and updates the user interface
 */
async function nfHandleCloseTicket() {
    const ticketId = nf.ticketDetailContainer.getAttribute('data-ticket-id');
    if (!ticketId) return;
    nfSetLoading(true);
    try {
        await nfCloseTicket(ticketId);
        if (typeof window.nfCache !== 'undefined') {
            window.nfCache.invalidate(`ticket_detail_${ticketId}`);
            if (typeof window.nfLogger !== 'undefined') {
                window.nfLogger.debug('Ticket detail cache invalidated after ticket close', { ticketId });
            }
        }
        nfShowStatus('Ticket marked as resolved.', 'success', 'ticketdetail');
        nfShowTicketList();
    } catch (err) {
        nfShowStatus('Error marking as resolved: ' + err.message, 'error', 'ticketdetail');
    } finally {
        nfSetLoading(false);
    }
}

export { nfSetupReplyInterface, nfHandleCloseTicket };
