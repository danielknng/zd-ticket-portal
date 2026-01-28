/**
 * @fileoverview Ticket actions and user interactions
 * @author danielknng
 * @module features/tickets/actions
 * @since 2025-01-XX
 * @version 2.0.0
 */

import { dom } from '../../ui/dom.js';
import { setLoading } from '../../ui/helpers.js';
import { showStatus } from '../../ui/status.js';
import { TicketService } from '../../api/tickets.js';
import { Modal } from '../../ui/modal.js';
import { 
    handleAttachFiles, 
    handleReplyAttachmentChange, 
    updateReplyFilePreview, 
    clearReplyFilePreview 
} from '../upload/file-handler.js';
import nfLogger from '../../core/logger.js';

/**
 * Sets up the reply user interface for ticket replies
 * @param {TicketService} ticketService - Ticket service instance
 * @param {Modal} modal - Modal instance
 */
export function setupReplyInterface(ticketService, modal) {
    let replyToggle = document.getElementById('nf_ticketdetail_replytoggle');
    
    if (!replyToggle) return;
    
    replyToggle.style.display = '';
    dom.ticketDetailReplyBox.classList.remove('nf-active');
    dom.ticketDetailReplyBox.style.display = 'none';
    
    replyToggle.onclick = function() {
        replyToggle.style.display = 'none';
        dom.ticketDetailReplyBox.classList.add('nf-active');
        dom.ticketDetailReplyBox.style.display = '';
        dom.ticketDetailReplyInput.focus();
    };
    
    let replyBtn = dom.ticketDetailReplyBox.querySelector('#nf_ticketdetail_replybtn');
    let attachBtn = dom.ticketDetailReplyBox.querySelector('#nf_ticketdetail_attachbtn');
    let cancelBtn = dom.ticketDetailReplyBox.querySelector('#nf_ticketdetail_replycancel');
    
    // Assign event handlers for reply functionality
    if (replyBtn) replyBtn.onclick = () => handleReplySend(ticketService, modal);
    if (attachBtn) attachBtn.onclick = handleAttachFiles;
    if (cancelBtn) cancelBtn.onclick = handleReplyCancel;
    
    // Setup file input change handler
    if (dom.ticketDetailAttachment) {
        dom.ticketDetailAttachment.onchange = handleReplyAttachmentChange;
    }
}

/**
 * Sends a reply in the ticket detail via the reply box
 * @param {TicketService} ticketService - Ticket service instance
 * @param {Modal} modal - Modal instance
 */
async function handleReplySend(ticketService, modal) {
    const text = dom.ticketDetailReplyInput.value.trim();
    if (!text) return;
    
    setLoading(true);
    try {
        const ticketId = dom.ticketDetailContainer.getAttribute('data-ticket-id');
        const files = dom.ticketDetailAttachment?.files || null;
        
        await ticketService.sendReply(ticketId, text, files);
        
        nfLogger.debug('Ticket detail cache invalidated after reply', { ticketId });
        
        showStatus('Reply sent!', 'success', 'ticketdetail');
        dom.ticketDetailReplyInput.value = '';
        clearReplyFilePreview();
        dom.ticketDetailReplyBox.classList.remove('nf-active');
        dom.ticketDetailReplyBox.style.display = 'none';
        
        const replyToggle = document.getElementById('nf_ticketdetail_replytoggle');
        if (replyToggle) replyToggle.style.display = '';
        
        // Reload ticket detail view
        const { showTicketDetailView } = await import('./detail.js');
        await showTicketDetailView(ticketId, ticketService, modal);
    } catch (err) {
        nfLogger.error('Error sending reply', { error: err });
        showStatus('Error sending reply: ' + err.message, 'error', 'ticketdetail');
    } finally {
        setLoading(false);
    }
}

/**
 * Cancels the reply in the ticket detail and resets the UI
 */
function handleReplyCancel() {
    dom.ticketDetailReplyBox.classList.remove('nf-active');
    dom.ticketDetailReplyBox.style.display = 'none';
    
    clearReplyFilePreview();
    
    const replyToggle = document.getElementById('nf_ticketdetail_replytoggle');
    if (replyToggle) replyToggle.style.display = '';
}

/**
 * Closes a ticket by setting its status to 'Closed'
 * @param {TicketService} ticketService - Ticket service instance
 * @param {Modal} modal - Modal instance
 */
export async function handleCloseTicket(ticketService, modal) {
    const ticketId = dom.ticketDetailContainer.getAttribute('data-ticket-id');
    if (!ticketId) return;
    
    setLoading(true);
    try {
        await ticketService.closeTicket(ticketId);
        
        nfLogger.debug('Ticket detail cache invalidated after ticket close', { ticketId });
        
        showStatus('Ticket marked as resolved.', 'success', 'ticketdetail');
        
        // Show ticket list
        const { show } = await import('../../ui/modal.js');
        show(dom.start);
        show(dom.ticketListContainer);
        modal.open('nf_ticketlist_container');
    } catch (err) {
        nfLogger.error('Error closing ticket', { error: err });
        showStatus('Error marking as resolved: ' + err.message, 'error', 'ticketdetail');
    } finally {
        setLoading(false);
    }
}

export default {
    setupReplyInterface,
    handleCloseTicket
};

